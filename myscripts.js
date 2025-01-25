 
let db, excelData, tableName, uploadedFileName;

async function initializeDB(file) {
    if (!file) {
        alert("Please upload a valid .db file.");
        return null;
    }

    const arrayBuffer = await file.arrayBuffer();
    const SQL = await initSqlJs({ locateFile: () => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm" });
    return new SQL.Database(new Uint8Array(arrayBuffer));
}

function formatDateTime(input) {
try {
// Check for extended date format (e.g., +057038-05-15 16:12:33)
if (typeof input === "string" && input.startsWith("+")) {
    const parts = input.match(/\+(\d+)-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
        const [_, year, month, day, hours, minutes, seconds] = parts;
        const normalizedYear = parseInt(year) - 57038 + 1970; // Normalize year
        return `${normalizedYear}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
}

// Handle UNIX timestamp (if applicable)
if (!isNaN(input) && input.length <= 10) {
    const date = new Date(parseInt(input) * 1000);
    return date.toISOString().replace("T", " ").split(".")[0];
}

// Handle ISO or standard date formats directly
const isoDate = new Date(input);
if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString().replace("T", " ").split(".")[0];
}

// Fallback: Return raw input
return input;
} catch (error) {
console.error("Error parsing date:", input, error);
return input; // Return raw value if parsing fails
}
}

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("dbFile");
    const downloadButton = document.getElementById("downloadButton");

    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadedFileName = file.name.replace(/\.db$/i, ""); // Remove .db extension
        }
        db = await initializeDB(file);
        if (db) {
            displayTables();
            downloadButton.classList.remove("hidden"); // Show the download button
        }
    });

    downloadButton.addEventListener("click", exportToExcel);
});

function displayTables() {
    if (!db) return;

    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    if (result.length === 0) {
        alert("No tables found in the database.");
        return;
    }

    tableName = result[0].values[0][0]; // Assume the first table
    const tableData = db.exec(`SELECT * FROM ${tableName}`);

    if (tableData.length === 0) {
        alert("Table is empty or invalid.");
        return;
    }

    const columns = tableData[0].columns;
    const rows = tableData[0].values;

    const thead = document.querySelector("#dataTable thead");
    const tbody = document.querySelector("#dataTable tbody");

    // Format and save Excel data
    excelData = [
        columns,
        ...rows.map(row =>
            row.map((cell, index) =>
                columns[index] === "CollectTime" ? formatDateTime(cell) : cell
            )
        )
    ];

    // Populate the table headers
    thead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join("")}</tr>`;

    // Populate the table rows
    tbody.innerHTML = rows
        .map(row =>
            `<tr>${row.map((cell, index) =>
                `<td>${columns[index] === "CollectTime" ? formatDateTime(cell) : cell}</td>`
            ).join("")}</tr>`
        )
        .join("");
}

function exportToExcel() {
    if (!db || !excelData || !tableName) {
        alert("Please upload a database file first.");
        return;
    }

    // Create a worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tableName);

    // Save to Excel using the uploaded file name
    const excelFileName = `${uploadedFileName || "database"}.xlsx`;
    XLSX.writeFile(workbook, excelFileName);
}
 