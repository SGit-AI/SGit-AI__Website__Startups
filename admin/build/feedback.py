#!/usr/bin/env python3
"""admin/build/feedback.py: the owner's end of the feedback lane. The site's pane (assets/components/sg-feedback/)
seals notes to the lane's public key and appends them; this script makes the lane, proves it, drains it and rotates it.

    python3 admin/build/feedback.py setup              # once: a vault, a key pair, an append token, an enum key; configure the lane
    python3 admin/build/feedback.py check              # a sealed note in, listed, fetched, opened, marked processed; a wrong token refused
    python3 admin/build/feedback.py drain [--out DIR] [--keep]   # every pending note, opened, written to DIR, a digest printed
    python3 admin/build/feedback.py rotate             # a new append token; the old lane code stops being able to write

The four capabilities of an append lane (https://sgit.ai/api/append-lanes.html), and where each lives here:

    append token   in the lane code Dinis types into the pane; writes, reads nothing; never in this repository
    enum key       in the owner file; lists, fetches, marks processed
    write key      derived from the vault key, in the owner file; configures (with the SG/Send access token) and purges
    private key    in the owner file (RSA-OAEP 3072, PKCS#8); decrypts; never sent anywhere

The owner file is JSON, read from the environment variable STARTUPS_FEEDBACK_OWNER (its whole text) or from
admin/credentials/feedback-owner.json, which git ignores. Nothing secret is ever printed. setup writes the public half,
admin/content/feedback/lane.json (the endpoint, the vault id, the public key, its fingerprint), which the site publishes:
a public key and a vault id are publishable; the append token is the gate and is not.

The envelope is sgit's hybrid v2, as the newsroom's inbox (assets/vault-pane/inbox.js there) and the sgit CLI write it:
a fresh AES-256-GCM key wrapped with RSA-OAEP (SHA-256); envelope {v: 2, w, i, c}; the lane payload is base64 of the
base64 of that JSON, as the append-lanes API documents ("encoded twice").
"""
import argparse
import base64
import hashlib
import json
import os
import secrets
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENDPOINT = "https://dev.send.sgraph.ai"
KIND = "startups-feedback/v1"
OWNER_FILE = ROOT / "admin/credentials/feedback-owner.json"
PUBLIC_FILE = ROOT / "admin/content/feedback/lane.json"
CODE_PREFIX = "sgf1"


class Lane:
    """The append routes, as one small HTTP client. Every call is a POST with a JSON body; a 404 is a wrong key or no lane."""

    def __init__(self, endpoint, vault):
        self.endpoint, self.vault = endpoint.rstrip("/"), vault

    def call(self, op, body, headers=None):
        req = urllib.request.Request(f"{self.endpoint}/api/vault/append/{op}/{self.vault}", data=json.dumps(body).encode(),
                                     method="POST", headers={"Content-Type": "application/json", **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, json.loads(r.read().decode() or "null")
        except urllib.error.HTTPError as e:
            return e.code, None

    def configure(self, write_key, access_token, anchors, enum_key_hash):
        return self.call("configure", {"append_anchors": anchors, "enum_key_hash": enum_key_hash},
                         {"x-sgraph-vault-write-key": write_key, "x-sgraph-access-token": access_token})

    def write(self, token, payload):
        return self.call("write", {"append_token": token, "payload": payload})

    def list(self, enum_key):
        out, after = [], None
        for _ in range(50):
            body = {"include_content": False, **({"after_file_id": after} if after else {})}
            status, j = self.call("list", body, {"x-sgraph-vault-enum-key": enum_key})
            if status != 200 or not j:
                raise SystemExit(f"feedback: list answered {status}")
            entries = j.get("entries") or []
            out += entries
            if not j.get("truncated") or not entries:
                break
            after = entries[-1]["file_id"]
        return out

    def fetch(self, enum_key, inbox, ids):
        files = []
        for i in range(0, len(ids), 100):
            status, j = self.call("fetch", {"inbox": inbox, "file_ids": ids[i:i + 100]}, {"x-sgraph-vault-enum-key": enum_key})
            if status != 200 or not j:
                raise SystemExit(f"feedback: fetch answered {status}")
            files += j.get("files") or []
        return files

    def mark_processed(self, enum_key, inbox, ids):
        moved = []
        for i in range(0, len(ids), 100):
            status, j = self.call("mark-processed", {"inbox": inbox, "file_ids": ids[i:i + 100]}, {"x-sgraph-vault-enum-key": enum_key})
            if status != 200 or not j:
                raise SystemExit(f"feedback: mark-processed answered {status}")
            moved += j.get("moved") or []
        return moved


class Envelope:
    """sgit's hybrid v2: seal to an SPKI public key, open with a PKCS#8 private key."""

    @staticmethod
    def seal(spki_der, text):
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        pub = serialization.load_der_public_key(spki_der)
        key, iv = AESGCM.generate_key(bit_length=256), secrets.token_bytes(12)
        c = AESGCM(key).encrypt(iv, text.encode(), None)
        w = pub.encrypt(key, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
        b = lambda x: base64.b64encode(x).decode()
        enc = b(json.dumps({"v": 2, "w": b(w), "i": b(iv), "c": b(c)}, separators=(",", ":")).encode())
        return base64.b64encode(enc.encode()).decode()

    @staticmethod
    def open(pkcs8_der, payload):
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        env = json.loads(base64.b64decode(base64.b64decode(payload)))
        if env.get("v") != 2:
            raise ValueError("not a v2 envelope")
        priv = serialization.load_der_private_key(pkcs8_der, password=None)
        key = priv.decrypt(base64.b64decode(env["w"]), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
        return AESGCM(key).decrypt(base64.b64decode(env["i"]), base64.b64decode(env["c"]), None).decode()


class Feedback:

    def __init__(self, args):
        self.args = args

    # ---- the owner file
    def owner(self):
        text = os.environ.get("STARTUPS_FEEDBACK_OWNER") or (OWNER_FILE.read_text() if OWNER_FILE.exists() else "")
        if not text.strip():
            raise SystemExit("feedback: no owner keys. Set STARTUPS_FEEDBACK_OWNER to the owner file's text, or put the file at admin/credentials/feedback-owner.json")
        return json.loads(text)

    def save_owner(self, o):
        OWNER_FILE.parent.mkdir(parents=True, exist_ok=True)
        OWNER_FILE.write_text(json.dumps(o, indent=1) + "\n")
        os.chmod(OWNER_FILE, 0o600)

    @staticmethod
    def sha(text):
        return hashlib.sha256(text.encode()).hexdigest()

    @staticmethod
    def fingerprint(spki_der):
        return "sha256:" + hashlib.sha256(spki_der).hexdigest()[:16]

    def access_token(self):
        t = os.environ.get("SG_SEND_ACCESS_TOKEN", "")
        if not t:
            raise SystemExit("feedback: SG_SEND_ACCESS_TOKEN is not set; configure needs it (from the environment, never a file)")
        return t

    def write_public(self, o):
        PUBLIC_FILE.parent.mkdir(parents=True, exist_ok=True)
        PUBLIC_FILE.write_text(json.dumps({
            "what": "The public half of this site's feedback lane: where the pane appends and the key it seals to. A vault id and a public key are publishable; the append token, which is the gate, is not here and never will be. Made by admin/build/feedback.py setup.",
            "endpoint": o["endpoint"], "vault": o["vault"], "public_key": o["public"], "fingerprint": o["fingerprint"],
            "kind": KIND, "code_prefix": CODE_PREFIX, "created": o["created"], "rotated": [r["at"] for r in o.get("rotated", [])],
        }, indent=1) + "\n")

    # ---- setup: a vault, the keys, the lane
    def setup(self):
        if OWNER_FILE.exists() and not self.args.force:
            raise SystemExit("feedback: admin/credentials/feedback-owner.json exists; setup has run (pass --force to make a new lane, which strands the old)")
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from sgit_ai.crypto.Vault__Crypto import Vault__Crypto
        from sgit_ai.core.Vault__Sync import Vault__Sync
        from sgit_ai.network.api.Vault__API import Vault__API
        token = self.access_token()
        api = Vault__API(base_url=ENDPOINT, access_token=token)
        api.setup()
        sync = Vault__Sync(crypto=Vault__Crypto(), api=api)
        work = Path(tempfile.mkdtemp(prefix="startups-feedback-"))
        (work / "README.md").write_text(
            "# startups.sgit.ai feedback\n\nThe vault behind startups.sgit.ai's feedback lane. Notes Dinis writes in the site's pane "
            "arrive in this vault's append lane, sealed to a key pair whose private half is held by Dinis, and are read by the site's "
            "agent with admin/build/feedback.py drain. Nothing in the commit tree is needed for the lane; this file says what the vault is for.\n")
        result = sync.init(str(work), vault_key=sync.generate_vault_key(), allow_nonempty=True)
        sync.commit(str(work), message="startups.sgit.ai feedback lane: what this vault is for")
        sync.push(str(work))
        vault_key, vault = result["vault_key"], result["vault_id"]
        keys = Vault__Crypto().derive_keys_from_vault_key(vault_key)
        priv = rsa.generate_private_key(public_exponent=65537, key_size=3072)
        spki = priv.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
        pkcs8 = priv.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        o = {"v": 1, "what": "The owner keys of startups.sgit.ai's feedback lane. SECRET: escrow with Dinis; never commit, paste or print.",
             "endpoint": ENDPOINT, "vault": vault, "vault_key": vault_key, "write_key": keys["write_key"],
             "token": secrets.token_hex(16), "enum_key": secrets.token_hex(32),
             "public": base64.b64encode(spki).decode(), "private": base64.b64encode(pkcs8).decode(),
             "fingerprint": self.fingerprint(spki), "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "rotated": []}
        status, j = Lane(ENDPOINT, vault).configure(o["write_key"], token, [self.sha(o["token"])], self.sha(o["enum_key"]))
        if status != 200:
            raise SystemExit(f"feedback: configure answered {status}; the vault {vault} exists, the lane does not")
        self.save_owner(o)
        self.write_public(o)
        print(f"feedback: lane ready on vault {vault}, key {o['fingerprint']}; owner keys in admin/credentials/feedback-owner.json (git ignores it); public half in admin/content/feedback/lane.json")

    # ---- the lane code: what Dinis types into the pane
    def code(self):
        o = self.owner()
        return f"{CODE_PREFIX}.{o['vault']}.{o['token']}"

    # ---- check: the round trip, and the negative control
    def check(self):
        o = self.owner()
        lane = Lane(o["endpoint"], o["vault"])
        probe = {"kind": KIND, "to": o["fingerprint"], "sent_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                 "from": {"label": "feedback.py check"}, "notes": [{"id": "check-" + secrets.token_hex(4), "text": "a check from feedback.py", "probe": True}]}
        status, j = lane.write(o["token"], Envelope.seal(base64.b64decode(o["public"]), json.dumps(probe)))
        ok_write = status == 200 and j == {"ok": True}
        bad, _ = lane.write(secrets.token_hex(16), Envelope.seal(base64.b64decode(o["public"]), json.dumps(probe)))
        refused = bad != 200
        found = None
        for e in lane.list(o["enum_key"]):
            for f in lane.fetch(o["enum_key"], e["inbox"], [e["file_id"]]):
                try:
                    msg = json.loads(Envelope.open(base64.b64decode(o["private"]), f["content"]))
                except Exception:
                    continue
                if any(n.get("id") == probe["notes"][0]["id"] for n in msg.get("notes", [])):
                    found = (e["inbox"], e["file_id"])
        if found:
            lane.mark_processed(o["enum_key"], *found[:1], [found[1]])
        print(f"feedback check: write with the token {'answered {\"ok\": true}' if ok_write else 'FAILED'}; a random token {'was refused (' + str(bad) + ')' if refused else 'was ACCEPTED'}; "
              f"the probe {'was listed, fetched, opened and marked processed' if found else 'was NOT found'}")
        if not (ok_write and refused and found):
            raise SystemExit(1)

    # ---- drain: every pending note, opened
    def drain(self):
        o = self.owner()
        lane = Lane(o["endpoint"], o["vault"])
        out = Path(self.args.out) if self.args.out else Path(tempfile.gettempdir()) / "startups-feedback" / o["vault"]
        out.mkdir(parents=True, exist_ok=True)
        entries, pkcs8 = lane.list(o["enum_key"]), base64.b64decode(o["private"])
        by = {}
        for e in entries:
            by.setdefault(e["inbox"], []).append(e["file_id"])
        notes, refused, done = [], [], []
        for inbox, ids in by.items():
            for f in lane.fetch(o["enum_key"], inbox, ids):
                try:
                    msg = json.loads(Envelope.open(pkcs8, f["content"]))
                    if msg.get("kind") != KIND or msg.get("to") != o["fingerprint"]:
                        raise ValueError("not a startups feedback message for this key")
                except Exception as e:
                    refused.append((f["file_id"], str(e)[:80]))
                    continue
                if self.args.only_from is not None and (msg.get("from") or {}).get("label") != self.args.only_from:
                    continue                                                    # someone else's: left pending, untouched
                done.append((inbox, f["file_id"]))
                for n in msg.get("notes", []):
                    if n.get("probe"):
                        continue
                    nd = out / n.get("id", f["file_id"])
                    nd.mkdir(parents=True, exist_ok=True)
                    for a in n.get("attachments", []):
                        name = Path(a.get("name") or "file").name
                        (nd / name).write_bytes(base64.b64decode(a.get("data", "")))
                        a["saved_as"] = str(nd / name)
                        a.pop("data", None)
                    n["message"] = {"file_id": f["file_id"], "sent_at": msg.get("sent_at"), "from": msg.get("from")}
                    (nd / "note.json").write_text(json.dumps(n, indent=1, ensure_ascii=False) + "\n")
                    notes.append(n)
        if not self.args.keep:
            for inbox in {i for i, _ in done}:
                lane.mark_processed(o["enum_key"], inbox, [fid for i, fid in done if i == inbox])
        notes.sort(key=lambda n: n.get("at", ""))
        print(f"feedback: {len(entries)} file(s) waiting, {len(done)} message(s) opened ({len(notes)} note(s)), {len(refused)} refused; written to {out}" + (" (left pending: --keep)" if self.args.keep else " (those marked processed)"))
        for n in notes:
            c = n.get("context") or {}
            print(f"\n## {n.get('at', '')[:16].replace('T', ' ')} · {c.get('title') or c.get('path') or '?'} · {c.get('url', '')}")
            if c.get("quote"):
                print(f"   on: \"{c['quote'][:300]}\"")
            if n.get("text"):
                print("   " + n["text"].replace("\n", "\n   "))
            if n.get("transcript"):
                print("   (voice) " + n["transcript"].replace("\n", "\n   "))
            for a in n.get("attachments", []):
                print(f"   [{a.get('kind', 'file')}] {a.get('saved_as')}")
        for fid, why in refused:
            print(f"\nrefused {fid}: {why}")

    # ---- rotate: a new token; configure replaces the anchors, so the old code is refused
    def rotate(self):
        o = self.owner()
        old = o["token"]
        o["token"] = secrets.token_hex(16)
        o.setdefault("rotated", []).append({"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
        status, _ = Lane(o["endpoint"], o["vault"]).configure(o["write_key"], self.access_token(), [self.sha(o["token"])], self.sha(o["enum_key"]))
        if status != 200:
            raise SystemExit(f"feedback: configure answered {status}; the old code still works")
        self.save_owner(o)
        self.write_public(o)
        bad, _ = Lane(o["endpoint"], o["vault"]).write(old, "AAAA")
        print(f"feedback: rotated; the old code is {'refused' if bad != 200 else 'STILL ACCEPTED'}; the new code is in the owner file (feedback.py code prints it)")

    def go(self):
        {"setup": self.setup, "check": self.check, "drain": self.drain, "rotate": self.rotate,
         "code": lambda: print(self.code())}[self.args.cmd]()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("cmd", choices=["setup", "check", "drain", "rotate", "code"])
    ap.add_argument("--out", help="drain: where the notes and their files are written (default: <tmp>/startups-feedback/<vault>)")
    ap.add_argument("--keep", action="store_true", help="drain: leave the files pending (do not mark them processed)")
    ap.add_argument("--only-from", dest="only_from", default=None, help="drain: only messages whose browser label is this; every other message is left pending (the browser test uses it)")
    ap.add_argument("--force", action="store_true", help="setup: make a new lane even if the owner file exists")
    Feedback(ap.parse_args()).go()
