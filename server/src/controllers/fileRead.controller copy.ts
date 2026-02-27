import { Request, Response } from "express";
import ExcelJS from 'exceljs';
import path from 'path';


export const readFile = async (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), "uploads", "data1.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];

  const allRows: any[] = [];
  const columnCount: Record<string, number> = {};

  let headers: string[] = [];

 worksheet.eachRow((row, rowNumber) => {

  const values: string[] = [];

  row.eachCell({ includeEmpty: true }, (cell) => {
    values.push(getCellValue(cell).trim());
  });

  if (values.every(v => v === "")) return;

  if (rowNumber === 1) {
    headers = values.map((h) => String(h).toLowerCase().trim().replace(/\s+/g, '_'));
    headers.forEach(h => columnCount[h] = 0);
    return;
  }

  const rowObject: any = {};

  headers.forEach((header, index) => {
    const value = values[index] ?? "";

    rowObject[header] = value;

    if (value !== "") {
      columnCount[header]++;
    }
  });

  allRows.push(rowObject);
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



interface RowData {
  [key: string]: any;
}

export const readFile123 = async (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), "uploads", "data.xlsx");

  const allRows: any[] = [];
  const columnCount: Record<string, number> = {};

  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    sharedStrings: "cache",
    worksheets: "emit",
  });

  let headers: string[] = [];
  let headerFound = false;

  for await (const worksheet of workbook) {
    for await (const row of worksheet) {

      const values: string[] = [];

      row.eachCell({ includeEmpty: true }, (cell) => {
        values.push(getCellValue(cell).trim());
      });

      // skip fully empty rows
      if (values.every(v => v === "")) continue;

      // 🟢 Detect header row properly
      if (!headerFound) {

        const stringCells = values.filter(v => isNaN(Number(v)) && v !== "");

        if (stringCells.length === 0) {
          // This row looks like data, not header
          continue;
        }

        headers = values.map((h, index) =>
          h !== "" ? h : `Column_${index + 1}`
        );

        headers.forEach(h => columnCount[h] = 0);

        headerFound = true;
        continue;
      }

      const rowObject: any = {};

      headers.forEach((header, index) => {
        const value = values[index] ?? "";

        rowObject[header] = value;

        if (value !== "") {
          columnCount[header]++;
        }
      });

      allRows.push(rowObject);
    }

    break; // first sheet only
  }

  res.json({
    countColoms: columnCount,
    data: allRows,
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

export const readFile1 = async(req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), 'uploads', 'data.xlsx');
  //return res.json(filePath)
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath,{
        entries: 'emit',
        sharedStrings: 'cache',
        styles: 'cache',
        hyperlinks: 'ignore',      
       worksheets: "emit",
  } );
  // const result: any[] = [];
  // const result_cntr: any[] = [];

  // let headers: string[] = [];
  // const columnCount: Record<string, number> = {};

  //  for await (const worksheet of workbook) {
  //   for await (const row of worksheet) {

  //     const values = row.values as any[];

  //     row.eachCell((cell, colNumber) => {
  //       values.push(cell.text); 
  //     });

  //     if (row.number === 1) {
  //       headers = values.map((h) => String(h).toLowerCase().trim().replace(/\s+/g, '_'));
  //        // Initialize counts
  //       headers.forEach(header => {
  //         columnCount[header] = 0;
  //       });
  //     } else {
  //       const obj: any = {};

  //       headers.forEach((header, index) => {
  //         //console.log(values[index])
  //         const value = values[index];

  //         obj[header] = value;
  //        // console.log("==>"+columnCount[header] +"=--"+header)          
  //         //console.log("==>"+header)
  //         // Count only if NOT null / NOT empty
  //         if (value !== undefined && value !== null && value !== "") {
  //           console.log("B4-->"+columnCount[header]+"  changes" +header+"===>"+value)
  //           columnCount[header] = columnCount[header]+1;
  //           console.log("aftr4-->"+columnCount[header]+"  changes" +header)
  //         }
  //       });

  //       result.push(obj);
  //     }
  //   }
  //   result_cntr.push(columnCount)
  // }
  let headers: string[] = [];
let isHeader = true;
const columnCount: Record<string, number> = {};
const result: any[] = [];
for await (const worksheet of workbook) {

  for await (const row of worksheet) {

    const values: string[] = [];

    row.eachCell((cell) => {
      values.push(cell.text.trim());
    });

    if (values.length === 0) continue;

    if (isHeader) {
      headers = values.map((h) => String(h).toLowerCase().trim().replace(/\s+/g, '_'));

      headers.forEach(header => {
        columnCount[header] = 0;
      });

      isHeader = false;
      continue;
    }
        const obj: any = {};

    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const value = cell.text.trim();
     // console.log(value)
      //obj[header] = value;
      if (value) {
        columnCount[header]++;
      }
    });
   //  result.push(obj);
  }

  break; // stop after first sheet
}

  res.status(200).json({
    success: true,
    data21:columnCount,
   data: result
  });
};

export const readFile1233 = async (req: Request, res: Response) => {
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

    if (values.every(v => v === "")) return;

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