import csv
import io

from django.http import HttpResponse, StreamingHttpResponse


class _Echo:
    def write(self, value):
        return value


def _safe_csv_text(value):
    text = "" if value is None else str(value)
    if text.lstrip(" \t\r\n").startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
        return "'" + text
    return text


def build_tabular_export(headers, rows, format_type, filename, sheet_name):
    if format_type == "csv":
        writer = csv.writer(_Echo(), lineterminator="\r\n")

        def csv_rows():
            yield writer.writerow([_safe_csv_text(value) for value in headers])
            for row in rows:
                yield writer.writerow(
                    [_safe_csv_text(value) for value in row]
                )

        response = StreamingHttpResponse(
            csv_rows(), content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}.csv"'
        return response

    if format_type != "xlsx":
        return HttpResponse("Unsupported export format.", status=400)

    try:
        from openpyxl import Workbook
        from openpyxl.cell import WriteOnlyCell
    except ImportError:
        return HttpResponse("XLSX export requires openpyxl.", status=503)

    workbook = Workbook(write_only=True)
    worksheet = workbook.create_sheet(title=sheet_name[:31])

    def text_cell(value):
        cell = WriteOnlyCell(
            worksheet, value="" if value is None else str(value)
        )
        cell.data_type = "s"
        return cell

    worksheet.append([text_cell(value) for value in headers])
    for row in rows:
        worksheet.append([text_cell(value) for value in row])

    output = io.BytesIO()
    workbook.save(output)
    response = HttpResponse(
        output.getvalue(),
        content_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}.xlsx"'
    return response
