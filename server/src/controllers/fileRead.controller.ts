import { Request, Response } from "express";
import ExcelJS from 'exceljs';
import path from 'path';
import fs from "fs";
import csv from "csv-parser";

export const readFile = async (req: Request, res: Response) => {


  const filePath = path.join(process.cwd(), "uploads", "data1.xlsx");
  
  const ext = path.extname(filePath).toLowerCase();
  
  let totalRows = 0;
  const allRows: any[] = [];
  const columnCount: Record<string, number> = {};
  let headers: string[] = [];
  let headerInitialized = false;
  
  if(ext==".xlsx")
  {
    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      entries: "emit",
      sharedStrings: "cache",
      hyperlinks: "cache",
      worksheets: "emit",
    });   

    for await (const worksheet of workbook) {
      for await (const row of worksheet) {
        const rowValues: string[] = [];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rowValues[colNumber - 1] = getCellValue(cell);
        });

        // Skip completely empty rows
        if (!rowValues.some(v => v && v.trim() !== "")) continue;

        // Initialize header (FIRST NON-EMPTY ROW ONLY)
        if (!headerInitialized) {
          headers = rowValues.map((h, index) =>h && h.trim() !== "" ? h.trim() : `Column_${index + 1}` );
          headers.forEach(h => columnCount[h] = 0);
          headerInitialized = true;
        
        }
        else
        {      
          const rowObject: any = {};
          // Process row (DO NOT STORE ALL if 100k+)
          headers.forEach((header, index) => {
            const value = rowValues[index] ?? "";
            rowObject[header] = value;

            if (value !== "") {
              columnCount[header]++;
            }
          });
          allRows.push(rowObject);
          totalRows++;      
        }
      }
      break; // Only first sheet
    }
  }
  else  if(ext==".csv"){
      await new Promise<void>((resolve, reject) => {

    fs.createReadStream(filePath)
      .pipe(csv({ headers: false })) // IMPORTANT: we handle header manually
      .on("data", (row: any) => {

        const rowValues: string[] = Object.values(row).map(v =>
          v ? String(v).trim() : ""
        );

        // Skip completely empty rows
        if (!rowValues.some(v => v !== "")) return;

        // Initialize header (FIRST NON-EMPTY ROW ONLY)
        if (!headerInitialized) {

          headers = rowValues.map((h, index) =>
            h !== "" ? h : `Column_${index + 1}`
          );

          headers.forEach(h => columnCount[h] = 0);

          headerInitialized = true;
          return;
        }

        // Process row
        const rowObject: any = {};

        headers.forEach((header, index) => {
          const value = rowValues[index] ?? "";

          rowObject[header] = value;

          if (value !== "") {
            columnCount[header]++;
          }
        });

        allRows.push(rowObject);
        totalRows++;
      })
      .on("end", () => resolve())
      .on("error", reject);
    })
  }

  res.json({
    totalRows,
    columnCount,
    allRows

  });
};
export const readFile123 = async (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), "uploads", "data1.xlsx");

  const workbook = new ExcelJS.Workbook();
  
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];  //read first sheet

  const allRows: any[] = [];
  const columnCount: Record<string, number> = {};

  let headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values: string[] = [];

    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(getCellValue(cell).trim());
    });
    //console.log(values)

   // if (values.every(v => v === "")) return;

    if (rowNumber === 1) {
      headers = values.map((h) => String(h).toLowerCase().trim().replace(/\s+/g, '_'));     
    }
    else{
      const rowObject: any = {};

      headers.forEach((header, index) => {        
        const value = values[index] ?? "";      
        rowObject[header] = value;

        if (value !== "") {
          columnCount[header] = (columnCount[header] |0 )+1;
        }
      });

      allRows.push(rowObject);
    }
  });

  res.json({
    countColoms: columnCount,
    data: allRows
  });
};
export const getUsers = (req: Request, res: Response) => {
  const users = [
    { id: 1, name: "John" },
    { id: 2, name: "Jane" }
  ];

  res.status(200).json({
    success: true,
    data: users
  });
};


// Safe cell value extractor
function getCellValue(cell: any): string {
  if (!cell || cell.value == null) return "";

  const value = cell.value;
  // string or number
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  // Date
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Hyperlink
  if (value.text && value.hyperlink) {
    return value.text;
  }

  // Rich text
  if (value.richText) {
    return value.richText.map((t: any) => t.text).join("");
  }

  // Formula
  if (value.formula && value.result != null) {
    return String(value.result);
  }

  // Shared string (streaming)
  if (cell.text) {
    return String(cell.text);
  }

  return "";
}
