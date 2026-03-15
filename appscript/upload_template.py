#!/usr/bin/env python3
"""
upload_template.py
Uploads all *_form.pdf files in this folder to Cloudflare R2.

Requirements:
    pip install boto3

Usage:
    py upload_template.py
"""

import os
import sys
import re
import boto3
from botocore.config import Config
from pathlib import Path

# ── Load .env from parent folder (QC_JEC_V2/.env) ────────────────────────────
here   = Path(__file__).parent
env_path = here.parent / '.env'

env = {}
if env_path.exists():
    for line in env_path.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^([^#=\s][^=]*)=(.*)$', line)
        if m:
            env[m.group(1).strip()] = m.group(2).strip().strip('"\'')

ACCOUNT_ID = env.get('VITE_R2_ACCOUNT_ID', '')
ACCESS_KEY = env.get('VITE_R2_ACCESS_KEY_ID', '')
SECRET_KEY = env.get('VITE_R2_SECRET_ACCESS_KEY', '')
BUCKET     = env.get('VITE_R2_BUCKET_NAME', '')
PUBLIC_URL = env.get('VITE_R2_PUBLIC_URL', '')
PREFIX     = env.get('VITE_R2_FOLDER_PREFIX', 'pomelo')


def main():
    s3 = boto3.client(
        's3',
        endpoint_url          = f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id     = ACCESS_KEY,
        aws_secret_access_key = SECRET_KEY,
        config                = Config(signature_version='s3v4'),
        region_name           = 'auto',
    )

    # Find all *_form.pdf files in this folder
    pdf_files = sorted(here.glob('*_form.pdf'))

    if not pdf_files:
        print('No *_form.pdf files found.')
        print('Run convert_all.bat first to generate form PDFs.')
        sys.exit(1)

    print(f'Found {len(pdf_files)} file(s) to upload:\n')
    uploaded = []

    for pdf_file in pdf_files:
        r2_key = f'{PREFIX}/templates/{pdf_file.name}'
        print(f'  Uploading {pdf_file.name} → {r2_key}')
        s3.upload_file(
            str(pdf_file),
            BUCKET,
            r2_key,
            ExtraArgs={'ContentType': 'application/pdf'},
        )
        public = f'{PUBLIC_URL}/{r2_key}'
        uploaded.append((pdf_file.name, public))
        print(f'  ✓  {public}\n')

    print('=' * 60)
    print('All uploads complete. Add these to your .env:\n')
    for name, url in uploaded:
        # Generate a VITE_ env key from the filename:
        # e.g. itr_cover_form.pdf → VITE_TEMPLATE_ITR_COVER
        key = 'VITE_TEMPLATE_' + name.replace('_form.pdf', '').upper()
        print(f'  {key}={url}')
    print()


if __name__ == '__main__':
    main()
