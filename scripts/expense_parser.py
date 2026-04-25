#!/usr/bin/env python3
"""
Voice expense parser — extracts structured expense data from natural language.
Called by Hermes agent to transform transcribed voice text into Firestore-ready data.

Usage:
    from expense_parser import parse_expense_text
    result = parse_expense_text("午餐吃拉麵花了180")
    # → {"description": "午餐拉麵", "amount": 180, "category": "餐飲", "date": "2026-04-17"}
"""

import json
import re
from datetime import datetime, timedelta


# Default category mapping (Chinese keywords → category)
CATEGORY_KEYWORDS = {
    "餐飲": ["吃", "午餐", "晚餐", "早餐", "飯", "麵", "餐", "喝", "咖啡", "茶", "飲料", "外送", "便當", "宵夜", "點心", "甜點", "蛋糕"],
    "交通": ["車", "油", "加油", "停車", "uber", "計程車", "捷運", "公車", "高鐵", "火車", "機票", "ubike", "悠遊卡"],
    "購物": ["買", "購", "衣服", "鞋", "包", "3C", "電子", "手機", "電腦", "配件"],
    "娛樂": ["電影", "遊戲", "KTV", "唱歌", "票", "展覽", "演唱會", "Netflix", "Spotify"],
    "生活": ["水費", "電費", "瓦斯", "網路", "手機費", "房租", "管理費", "洗衣", "理髮", "剪髮"],
    "醫療": ["醫", "藥", "看診", "掛號", "牙", "眼鏡", "保健"],
    "日用品": ["超市", "全聯", "家樂福", "衛生紙", "洗衣精", "日用"],
}

PAYMENT_KEYWORDS = {
    "cash": ["現金", "付現"],
    "card": ["刷卡", "信用卡", "卡"],
    "e-wallet": ["Line Pay", "街口", "悠遊付", "Apple Pay", "Google Pay", "行動支付"],
    "bank": ["轉帳", "匯款", "銀行"],
}

DATE_KEYWORDS = {
    "今天": 0, "今日": 0,
    "昨天": -1, "昨日": -1,
    "前天": -2, "前日": -2,
}


def guess_category(text):
    text_lower = text.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                return cat
    return "其他"


def guess_payment_method(text):
    text_lower = text.lower()
    for method, keywords in PAYMENT_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                return method
    return "cash"


def extract_amount(text):
    """Extract numeric amount from text."""
    # Try patterns like "180元", "花了180", "$180", "NT$180"
    patterns = [
        r'(?:NT?\$|＄)\s*(\d+(?:\.\d+)?)',
        r'(\d+(?:\.\d+)?)\s*(?:元|塊|圓)',
        r'(?:花了?|付了?|給了?|共|總共|合計)\s*(\d+(?:\.\d+)?)',
        r'(\d+(?:\.\d+)?)',  # fallback: any number
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            return float(m.group(1))
    return None


def extract_date(text):
    """Extract date from text, default to today."""
    today = datetime.now()
    for keyword, offset in DATE_KEYWORDS.items():
        if keyword in text:
            d = today + timedelta(days=offset)
            return d.strftime("%Y-%m-%d")
    # Try YYYY-MM-DD or MM/DD
    m = re.search(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', text)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.search(r'(\d{1,2})[/月](\d{1,2})[日號]?', text)
    if m:
        return f"{today.year}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    return today.strftime("%Y-%m-%d")


def parse_expense_text(text):
    """
    Parse natural language expense text into structured data.
    Returns dict with: description, amount, category, date, payment_method, notes
    """
    amount = extract_amount(text)
    if amount is None:
        return {"error": "無法辨識金額", "raw": text}

    category = guess_category(text)
    payment_method = guess_payment_method(text)
    date = extract_date(text)

    # Clean description: remove amount and date keywords
    desc = text.strip()
    # Remove amount patterns
    desc = re.sub(r'(?:NT?\$|＄)\s*\d+(?:\.\d+)?', '', desc)
    desc = re.sub(r'\d+(?:\.\d+)?\s*(?:元|塊|圓)', '', desc)
    desc = re.sub(r'(?:花了?|付了?)\s*\d+(?:\.\d+)?', '', desc)
    # Remove date keywords
    for kw in DATE_KEYWORDS:
        desc = desc.replace(kw, '')
    desc = re.sub(r'\s+', ' ', desc).strip()
    if not desc:
        desc = category

    return {
        "description": desc,
        "amount": amount,
        "category": category,
        "date": date,
        "paymentMethod": payment_method,
        "notes": f"語音記帳: {text}",
        "raw": text,
    }


if __name__ == "__main__":
    # Test cases
    tests = [
        "午餐吃拉麵花了180",
        "昨天加油1200元",
        "買咖啡$85",
        "Uber回家350塊",
        "Netflix月費390刷卡",
        "今天午餐便當75元",
    ]
    for t in tests:
        r = parse_expense_text(t)
        print(f"「{t}」→ {json.dumps(r, ensure_ascii=False)}")
