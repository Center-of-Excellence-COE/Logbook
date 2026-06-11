# Welcome to the NOAA - Tier - Logbook Documentation

The **NOAA - Tier - Logbook** is a comprehensive tool designed to enhance the tracking of individual time, experience, and system proficiency across different hydrographic and ocean mapping projects. 

This application is fully integrated into the **NOAA - OCS - Center of Excellence (CoE) Tier systems** and is a critical stepping stone for the **NSPS - THSOA Certification workflow**. 

**Important Note:** This form is designed to be updated at the *end* of a leg, project, or cruise. It is not intended to be a day-to-day timesheet. 

Currently (v0.1), this is a client-side application. **Users are entirely responsible for maintaining and backing up their own JSON save files.** In the future, this application will be transitioned into a CoE-hosted web portal with a centralized database. Starting early with this standalone version ensures your data is ready and formatted for a seamless transition!

If you encounter any bugs or have feature requests, please report them to CoE at: **taylor.krabiel@noaa.gov**

---

## Contents
1. [Navigating the Logbook](#navigating-the-logbook)
2. [Data Imports (Loading Data)](#data-imports-loading-data)
3. [Field Breakdown & Best Practices](#field-breakdown--best-practices)
4. [Data Exports](#data-exports)

---

## Navigating the Logbook

The interface is built into three main sections:
1. **User Information:** Your global identity metadata.
2. **Add / Edit Log Entry:** The primary workspace where project and activity data is entered, either manually or via XML imports.
3. **Current Project Logs:** A table displaying your active entries, allowing you to edit, delete, and review your total logged hours.

A sticky navigation bar at the top of the screen provides quick access to **LOAD** your previous work or XML metadata, and **EXPORT** your progress into various formats.

---

## Data Imports (Loading Data)

To save time, the Logbook can parse official NOAA XML files and automatically fill out project metadata (like Project Name, Geographic Location, Field Unit, and Systems Used). Use the **LOAD** dropdown at the top of the screen:

* **NOAA-OCS-XML: Metadata report (2026):** Parses the newest 2026 metadata structure. Automatically extracts the Field Unit, Project/Survey IDs, Geographic Location, and intelligently maps positioning systems, depth sensors, and sound speed sensors into the "Systems Used" checklist.
* **NOAA-OCS-XML: Project Instructions 2026:** Pulls high-level project directives, automatically filling the Project Description, Location, and Field Unit. *(Note: Currently optimized for 2026 PIs).*
* **NOAA-OCS-XML: Descriptive Report (Prior to 2024):** A legacy parser that digs through pre-2024 DRs to extract project names, field units, locations, and major equipment models.
* **Load Logbook JSON:** Use this to load your previously saved progress! Since no data is stored on a server, you must load your Master JSON file every time you return to the tool.

---

## Field Breakdown & Best Practices

When adding a new log entry, the following information is required. 

* **Project Name / Cruise:** The official Unique ID and Name (e.g., *OPR-P356-FA-24, H14004*).
* **Job Title:** Your specific role during the leg (e.g., *Survey Tech, Junior Officer, Physical Scientist, Tier 1 Mapping Specialist, Hydrographer In Charge*).
* **Geographic Location:** The general area of operations (e.g., *Gulf of Maine, Maine*).
* **Project Description:** A brief overview of the project's purpose and scope.
* **Organization (CRITICAL):** This is the organization that *employs you* for this specific survey. For example, if you are employed by a ship or stationed on a ship, select that ship, even if you did this project on another vessel. If you are employed by a branch but augmenting on a ship, put the branch. **This field is used to organize your log by your employment group for future exports to the NSPS-THSOA Certification.**
* **Date Range & Hours:** Select your Start and End dates. The tool features built-in mathematical validation to ensure you cannot log more hours than physically possible in a given timeframe. You can log hours as a "Total" or as an "Average per Day" (with weekend toggles).
* **Activity Category & Performed:** Select high-level categories (Acquisition, Processing, etc.) and write a brief description of your specific duties.
* **Field Unit & Vessel Type:** The actual platform you were operating on (e.g., *NOAA Ship Thomas Jefferson*).
* **System(s) & Software Used:** Multi-select dropdowns to track your specific technical proficiencies (e.g., *EM122, CARIS, Qimera*).

---

## Data Exports

Once your log entries are complete, use the **EXPORT** dropdown to save and format your data.

* **Logbook JSON (Save File):** This is the most important export. It generates the Master JSON file containing all your data. **You must export and save this file to your local computer to preserve your progress.**
* **Logbook CSV:** Exports a clean, flat spreadsheet of all your logged entries, matching the columns seen in the "Current Project Logs" UI table. Perfect for quick reviews or personal archiving.
* **Logbook Doc:** Generates a highly formatted, mega Microsoft Word Document (`.docx`). The document automatically groups your experience by **Organization**, placing each employer on a new page, and generates clean, presentation-ready tables detailing the projects, dates, systems used, and hours logged beneath them.
