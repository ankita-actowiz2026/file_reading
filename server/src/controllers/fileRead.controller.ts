import { Request, Response, NextFunction  } from "express";
import ExcelJS from 'exceljs';
import path from 'path';
import fs from "fs";
import csv from "csv-parser";
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { pipeline } from 'stream/promises';

const readCsv = async(filePath:string) =>{
  let totalRows = 0;
  const allRows: any[] = [];
  const columnCount: Record<string, number> = {};
  let headers: string[] = [];
  let headerInitialized = false;
  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on("data", (row: any) => {

          const rowValues: string[] = Object.values(row).map(v =>
            v ? String(v).trim().replace(/\s+/g, '_') : ""
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
      return  ({
      "totalRows": totalRows,
      "columnCount":columnCount,
      "allRows":allRows
    });
  } catch (error: any) {
    throw new Error(`Failed to read CSV file: ${filePath}. ${error.message}`);
  }  
}
const readJson = async(filePath:string) =>{
  let totalRows = 0;
  const allRows: any[] = [];
  const columnCount: Record<string, number> = {}; 
  
  try{
    await pipeline(
          fs.createReadStream(filePath),
          parser(),
          streamArray(),
          async function (
            source: AsyncIterable<{ key: number; value: Record<string, unknown> }>
          ): Promise<void> {
            for await (const { value } of source) {
              allRows.push(value);
              totalRows++;

              for (const key of Object.keys(value)) {
                const new_key= String(key).toLowerCase().trim().replace(/\s+/g, '_');
                columnCount[new_key] = (columnCount[new_key] ?? 0) + 1;
              }
            }
          }
        );
      return  ({
      "totalRows": totalRows,
      "columnCount":columnCount,
      "allRows":allRows
    });  
  } catch (error: any) {
    throw new Error(`Failed to read CSV file: ${filePath}. ${error.message}`);
  }  
}
const readXlsx = async(filePath:string) =>{
  let totalRows = 0;
  const allRows: any[] = [];
  const columnCount: Record<string, number> = {};
  let headers: string[] = [];
  let headerInitialized = false;
  try{
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
            headers = rowValues.map((h, index) =>h && h.trim() !== "" ? h.trim().replace(/\s+/g, '_') : `Column_${index + 1}` );
            
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
      return  ({
      "totalRows": totalRows,
      "columnCount":columnCount,
      "allRows":allRows
    });
  } catch (error: any) {    
    throw new Error(`Failed to read CSV file: ${filePath}. ${error.message}`);
  }  

}
export const readFile = async (req: Request, res: Response, next: NextFunction ) => {
  const file_json="data123.json"
  const file_csv="data.csv"
  const file_xls="data_large.xlsx"
  type FileResult = {
    totalRows: number;
    columnCount: Record<string, number>;
    allRows: Record<string, unknown>[];
  };
  try {
    const filePath = path.join(process.cwd(), "uploads",file_xls);  
    const ext = path.extname(filePath).toLowerCase();
  
    let result:FileResult
    switch (ext) {
      case '.json':
        result = await readJson(filePath);
        break;
      case '.csv':
        result = await readCsv(filePath);
        break;
      case '.xlsx':     
        result = await readXlsx(filePath);
        break;
      default:
        throw new Error('Unsupported file type');
    }
    res.status(200).json({
      success: true,
      data: result,
    });
  }
  catch (error) {
    next(error); 
  }
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