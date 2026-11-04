import csv
import io
from itertools import islice
from zipfile import BadZipFile


def _text_value(value):
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value).strip()


def read_tabular_upload(uploaded_file, max_file_size, max_rows, max_columns):
    if uploaded_file.size > max_file_size:
        raise ValueError(f"File exceeds the {max_file_size // (1024 * 1024)} MB import limit.")

    filename = (uploaded_file.name or "").lower()
    if filename.endswith(".csv"):
        try:
            uploaded_file.seek(0)
            reader = csv.DictReader(
                io.StringIO(uploaded_file.read().decode("utf-8-sig"))
            )
            headers = reader.fieldnames or []
            raw_rows = list(islice(reader, max_rows + 1))
        except UnicodeDecodeError as error:
            raise ValueError("CSV file must use UTF-8 encoding.") from error
    elif filename.endswith(".xlsx"):
        try:
            from openpyxl import load_workbook
            from openpyxl.utils.exceptions import InvalidFileException
        except ImportError as error:
            raise ValueError("XLSX support is not available.") from error

        workbook = None
        try:
            uploaded_file.seek(0)
            workbook = load_workbook(uploaded_file, read_only=True, data_only=True)
            worksheet = workbook.active
            header_values = next(
                worksheet.iter_rows(min_row=1, max_row=1, values_only=True), ()
            )
            headers = []
            for value in header_values:
                if value is None or not str(value).strip():
                    break
                headers.append(str(value).strip())
            raw_rows = []
            for values in worksheet.iter_rows(min_row=2, values_only=True):
                if not any(value is not None and str(value).strip() for value in values):
                    continue
                if len(raw_rows) >= max_rows:
                    raw_rows.append({})
                    break
                raw_rows.append(
                    {
                        header: _text_value(values[index])
                        if index < len(values)
                        else ""
                        for index, header in enumerate(headers)
                    }
                )
        except (BadZipFile, InvalidFileException, OSError, ValueError, KeyError) as error:
            raise ValueError(f"Unable to read XLSX file: {error}") from error
        finally:
            if workbook is not None:
                workbook.close()
    else:
        raise ValueError("Unsupported file format. Please use CSV or XLSX.")

    if len(headers) > max_columns:
        raise ValueError(f"File exceeds the {max_columns}-column import limit.")
    if not headers or any(not str(header).strip() for header in headers):
        raise ValueError("File must include a header row with column names.")
    if len({str(header).strip() for header in headers}) != len(headers):
        raise ValueError("File contains duplicate column names.")
    if len(raw_rows) > max_rows:
        raise ValueError(f"File exceeds the {max_rows}-row import limit.")

    rows = [
        {str(header): _text_value(row.get(header, "")) for header in headers}
        for row in raw_rows
    ]
    return headers, rows
