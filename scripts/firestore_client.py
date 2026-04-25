#!/usr/bin/env python3
"""
Lightweight Firestore REST API client for Termux.
No firebase-admin / grpcio needed — just google-auth + requests.

Usage:
    from firestore_client import FirestoreClient
    client = FirestoreClient("/path/to/service-account.json")
    client.add_document("expenses", {"userId": "abc", "amount": 100, ...})
"""

import json
import time
import os
from datetime import datetime, timezone

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPES = ["https://www.googleapis.com/auth/datastore"]


class FirestoreClient:
    def __init__(self, service_account_path=None):
        sa_path = service_account_path or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not sa_path or not os.path.exists(sa_path):
            raise FileNotFoundError(
                f"Service account JSON not found: {sa_path}\n"
                "Download from Firebase Console → Project Settings → Service Accounts"
            )
        self._creds = service_account.Credentials.from_service_account_file(sa_path, scopes=SCOPES)
        with open(sa_path) as f:
            sa_data = json.load(f)
        self.project_id = sa_data["project_id"]
        self.base_url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents"

    def _get_headers(self):
        if not self._creds.valid:
            self._creds.refresh(Request())
        return {
            "Authorization": f"Bearer {self._creds.token}",
            "Content-Type": "application/json",
        }

    # ── Value encoding ──────────────────────────────────────────
    @staticmethod
    def _encode_value(v):
        if v is None:
            return {"nullValue": None}
        if isinstance(v, bool):
            return {"booleanValue": v}
        if isinstance(v, int):
            return {"integerValue": str(v)}
        if isinstance(v, float):
            return {"doubleValue": v}
        if isinstance(v, str):
            return {"stringValue": v}
        if isinstance(v, datetime):
            return {"timestampValue": v.isoformat()}
        if isinstance(v, list):
            return {"arrayValue": {"values": [FirestoreClient._encode_value(i) for i in v]}}
        if isinstance(v, dict):
            return {"mapValue": {"fields": {k: FirestoreClient._encode_value(val) for k, val in v.items()}}}
        return {"stringValue": str(v)}

    @staticmethod
    def _decode_value(v):
        if "stringValue" in v:
            return v["stringValue"]
        if "integerValue" in v:
            return int(v["integerValue"])
        if "doubleValue" in v:
            return v["doubleValue"]
        if "booleanValue" in v:
            return v["booleanValue"]
        if "nullValue" in v:
            return None
        if "timestampValue" in v:
            return v["timestampValue"]
        if "arrayValue" in v:
            return [FirestoreClient._decode_value(i) for i in v["arrayValue"].get("values", [])]
        if "mapValue" in v:
            return {k: FirestoreClient._decode_value(val) for k, val in v["mapValue"].get("fields", {}).items()}
        return None

    @staticmethod
    def _decode_doc(doc):
        fields = doc.get("fields", {})
        result = {k: FirestoreClient._decode_value(v) for k, v in fields.items()}
        # Extract document ID from name
        result["_id"] = doc["name"].split("/")[-1]
        result["_path"] = doc["name"]
        return result

    # ── CRUD ────────────────────────────────────────────────────
    def add_document(self, collection, data):
        """Create a new document with auto-generated ID."""
        fields = {k: self._encode_value(v) for k, v in data.items()}
        url = f"{self.base_url}/{collection}"
        resp = requests.post(url, headers=self._get_headers(), json={"fields": fields})
        resp.raise_for_status()
        return self._decode_doc(resp.json())

    def get_document(self, collection, doc_id):
        """Get a single document."""
        url = f"{self.base_url}/{collection}/{doc_id}"
        resp = requests.get(url, headers=self._get_headers())
        resp.raise_for_status()
        return self._decode_doc(resp.json())

    def update_document(self, collection, doc_id, data):
        """Update specific fields of a document."""
        fields = {k: self._encode_value(v) for k, v in data.items()}
        mask = "&".join(f"updateMask.fieldPaths={k}" for k in data.keys())
        url = f"{self.base_url}/{collection}/{doc_id}?{mask}"
        resp = requests.patch(url, headers=self._get_headers(), json={"fields": fields})
        resp.raise_for_status()
        return self._decode_doc(resp.json())

    def delete_document(self, collection, doc_id):
        """Delete a document."""
        url = f"{self.base_url}/{collection}/{doc_id}"
        resp = requests.delete(url, headers=self._get_headers())
        resp.raise_for_status()
        return True

    def query(self, collection, user_id=None, filters=None, order_by=None, limit=20):
        """
        Run a structured query on a collection.
        filters: list of (field, op, value) tuples. op: EQUAL, LESS_THAN, GREATER_THAN, etc.
        """
        where_filters = []
        if user_id:
            where_filters.append({
                "fieldFilter": {
                    "field": {"fieldPath": "userId"},
                    "op": "EQUAL",
                    "value": self._encode_value(user_id),
                }
            })
        if filters:
            for field, op, value in filters:
                where_filters.append({
                    "fieldFilter": {
                        "field": {"fieldPath": field},
                        "op": op,
                        "value": self._encode_value(value),
                    }
                })

        structured_query = {
            "from": [{"collectionId": collection}],
            "limit": limit,
        }
        if where_filters:
            if len(where_filters) == 1:
                structured_query["where"] = where_filters[0]
            else:
                structured_query["where"] = {
                    "compositeFilter": {"op": "AND", "filters": where_filters}
                }
        if order_by:
            structured_query["orderBy"] = [
                {"field": {"fieldPath": order_by}, "direction": "DESCENDING"}
            ]

        url = f"{self.base_url}:runQuery"
        resp = requests.post(url, headers=self._get_headers(), json={"structuredQuery": structured_query})
        resp.raise_for_status()
        results = []
        for item in resp.json():
            if "document" in item:
                results.append(self._decode_doc(item["document"]))
        return results


# ── Convenience: Expense helpers ───────────────────────────────
def create_expense(client, user_id, description, amount, category,
                   date=None, notes="", payment_method="cash",
                   card_id=None, bank_id=None, ewallet_id=None):
    """Create a structured expense document matching the app's schema."""
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "userId": user_id,
        "description": description,
        "amount": float(amount),
        "category": category,
        "date": date or datetime.now().strftime("%Y-%m-%d"),
        "notes": notes,
        "paymentMethod": payment_method,
        "createdAt": now,
        "updatedAt": now,
    }
    if card_id:
        data["cardId"] = card_id
    if bank_id:
        data["bankId"] = bank_id
    if ewallet_id:
        data["ewalletId"] = ewallet_id
    return client.add_document("expenses", data)


if __name__ == "__main__":
    # Quick test
    import sys
    if len(sys.argv) < 2:
        print("Usage: python firestore_client.py <service-account.json> [test]")
        sys.exit(1)
    c = FirestoreClient(sys.argv[1])
    print(f"✓ Connected to project: {c.project_id}")
    if len(sys.argv) > 2 and sys.argv[2] == "test":
        docs = c.query("categories", limit=5)
        print(f"✓ Found {len(docs)} categories")
        for d in docs:
            print(f"  - {d.get('name', '?')}")
