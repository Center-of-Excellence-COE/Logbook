# Welcome to the NOAA Logbook for Tiers Documentation

The **NOAA Logbook for Tiers** is a comprehensive, multi-stage application designed to streamline how marine personnel track their sea time, system proficiencies, software experience, and educational milestones. 

This suite bridges the gap between end-of-project reporting within the **NOAA - OCS - Center of Excellence (CoE) Tier systems** and the formal application process for the **NSPS - THSOA Hydrographer Certification (S-5A / S-5B)**.

> **Important Note on Data Storage:** Currently (v0.2), this entire suite operates as a standalone, client-side web application. **No data is sent to or stored on a remote server.** Users are entirely responsible for saving, maintaining, and backing up their own Master JSON files on their local computers.

If you encounter any bugs, have feature requests, or experience issues with XML imports, please report them to CoE at: **taylor.krabiel@noaa.gov**

---

## Part 1: Navigating the Logbook

The Logbook interface is divided into three functional workspaces:
* **User Information:** Global metadata identifying you as the applicant, including a checklist of your **Current Qualification(s)** (e.g., Tier 1, US - Certified Hydrographer).
* **Add / Edit Log Entry:** The primary data entry form where project details, dates, platforms, systems, and activities are recorded. 
* **Current Project Logs:** A dynamic summary table displaying all recorded entries. Allows you to edit existing entries, remove mistakes, and view an automated tally of your total logged hours.

---

## Part 2: Data Imports & Automated Heuristics

To save time and reduce manual data entry, the Logbook can parse official NOAA XML files and automatically populate project metadata. Access these via the **LOAD ▼** menu:

* **NOAA - OCS - Metadata/DR:** Supports both pre-2024 Legacy Descriptive Reports (`.xml`) and modern 2026 Metadata Reports. Automatically extracts project IDs, vessel names, geographic areas, and maps sensors into your systems checklist.
* **NOAA-OCS-XML: Project Instructions 2026:** Pulls high-level project directives from 2026 PIs.
* **Automated Software Skimming (Heuristic Check):** Because descriptive reports often embed software names within lengthy discussion paragraphs, the importer runs an automated text-skimming heuristic. It scans the raw XML text for keywords (e.g., *CARIS, Pydro, Qimera, SIS5*) and automatically checks the corresponding boxes. *Always verify the auto-selected software list!*
* **Load Logbook JSON:** Loads your previously saved Logbook progress from your local hard drive.

> **Visual Check (Yellow Highlighting):** Whenever data is imported from an XML file, any form field that remains blank or reads "N/A" will be automatically highlighted in **YELLOW**. 

---

## Part 3: Field Breakdown & Best Practices

When logging a project entry, adherence to the following rules ensures your data converts cleanly for certification and tier tracking:

* **Working Towards (This Log):** Select which Tier or qualification this specific block of sea time is being applied to. This allows you to back-calculate exactly how many hours were spent earning each tier.
* **Organization (CRITICAL):** This field represents the entity that *employs you* or where you are permanently stationed. If you are permanently assigned to the *NOAA Ship Fairweather* but are temporarily augmenting on the *Thomas Jefferson*, **you must put NOAA Ship Fairweather as your Organization.** This is used to accurately group your sea time by employer during certification exports.
* **Date Range & Hours:** Your operational start and end dates. Includes mathematical validation to prevent logging physically impossible hours. 
* **Activity & Activity Detail:** Select high-level activities (Acquisition, Processing) and provide a brief description of the specific duties performed.
* **Optional Percentage (%) Breakdowns:** If you select *multiple* items in the Activity, Vessel Type, Systems, or Software checklists, an optional breakdown row will appear. You can enter rough percentages (e.g., 80% Ship, 20% Launch) to specify how your time was split. **These must equal exactly 100%.** If left blank, the app distributes the logged hours evenly across the selected items.

---

## Part 4: Data Exports

Once your project logs are up to date, use the **EXPORT ▼** dropdown to generate reports or transfer files:

* **Logbook JSON (Save File):** Generates your Master `_NOAAlogbook.json` save file. **You must export and save this locally after every session to preserve your progress.**
* **Summary CSV (Tier Breakdown):** A highly aggregated, machine-readable spreadsheet. It calculates the exact hours spent on specific systems, software, and activities, grouped by Year and the Tier you were working towards (factoring in your custom percentage breakdowns).
* **Full Logbook CSV:** Exports a flat spreadsheet of your individual log entries, matching the columns displayed in the UI table (with your custom percentages appended to the text).
* **Convert to Certification JSON (Experimental):** Restructures your individual log entries into the official NSPS-THSOA certification application schema, combining overlapping dates and concatenating project descriptions for the Competency Portal.
