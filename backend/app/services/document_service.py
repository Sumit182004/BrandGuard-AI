from io import BytesIO

from docx import Document
from fastapi import HTTPException
from pypdf import PdfReader


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def extract_text(filename: str, file_bytes: bytes) -> str:
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum supported file size is 10 MB.",
        )

    extension = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    try:
        if extension == "txt":
            text = file_bytes.decode("utf-8-sig")

        elif extension == "pdf":
            reader = PdfReader(BytesIO(file_bytes))

            if reader.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported.",
                )

            text = "\n".join(page.extract_text() or "" for page in reader.pages)

        elif extension == "docx":
            document = Document(BytesIO(file_bytes))
            paragraphs = [p.text for p in document.paragraphs]
            text = "\n".join(paragraphs)

        else:
            raise HTTPException(
                status_code=415,
                detail="Supported formats: TXT, PDF, and DOCX.",
            )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to read this file. Check its format and contents.",
        ) from exc

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text found in the uploaded file.",
        )

    return text.strip()