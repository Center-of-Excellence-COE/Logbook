const activityList = ["Acquisition", "Processing", "Planning", "Integration"];
const vesselTypesArray = ["Ship", "Launch", "Small Boat (under 65 feet)", "UxS", "Other", "N/A"];
const fieldUnitList = ["Land-based", "Bell M. Shimada", "Fairweather", "Ferdinand R. Hassler", "Gordon Gunter", "Henry B. Bigelow", "Nancy Foster", "NRT Fernandina", "NRT Gulfport", "NRT New London", "NRT Patuxent", "NRT Seattle", "Okeanos Explorer", "Oregon II", "Oscar Dyson", "Oscar Elton Sette", "Pisces", "Rainier", "Reuben Lasker", "Ronald H. Brown", "Thomas Jefferson"];
const equipmentList = ["N/A", "EM122", "EM124", "EM302", "EM304", "EM710", "EM712", "EM2040", "EM2040C", "EK60", "EK80", "ME70", "Klein 500", "Klein 5000", "SBP29"];
const softwareList = ["N/A", "CARIS", "Charlene", "Fledermaus", "FMGT", "HYPACK", "POSPac", "Pydro (all others)", "QC Tools", "Qimera", "SIS5", "Sound Speed Manager"];

let projectLogs = [];
let currentEditId = null; 

// --- SECURITY SANITIZATION HELPERS ---
function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, function(match) {
        const escape = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return escape[match];
    });
}

function sanitizeCSV(str) {
    if (str === null || str === undefined) return '';
    let s = String(str);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // Prevent CSV Formula Injection
    return s;
}

// --- NATIVE FILE SAVING ---
function nativeSaveAs(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

window.onload = function() {
    populateDatalist('fieldUnitDatalist', fieldUnitList);
    
    populateCheckboxList('activityCategoryList', 'activityCategoryInput', activityList);
    populateCheckboxList('vesselTypeList', 'vesselTypeInput', vesselTypesArray);
    populateCheckboxList('equipmentList', 'equipmentInput', equipmentList);
    populateCheckboxList('softwareList', 'softwareInput', softwareList);
    
    const today = new Date();
    document.getElementById('startDate').valueAsDate = today;
    document.getElementById('endDate').valueAsDate = today;

    window.onclick = function(event) {
        if (!event.target.matches('.dropbtn')) {
            var dropdowns = document.getElementsByClassName("dropdown-content");
            for (var i = 0; i < dropdowns.length; i++) {
                if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
            }
        }
        if (!event.target.closest('.dropdown-checklist')) {
            document.querySelectorAll('.dropdown-checklist ul.items').forEach(ul => ul.style.display = 'none');
        }
    };

    // Remove yellow highlights automatically when user types in them
    document.querySelectorAll('#logEntrySection input, #logEntrySection textarea').forEach(input => {
        input.addEventListener('input', function() { this.classList.remove('xml-missing'); });
        input.addEventListener('change', function() { this.classList.remove('xml-missing'); });
    });
};

function toggleTopMenu(id) { document.getElementById(id).classList.toggle("show"); }

function populateDatalist(elementId, dataArray) {
    const datalist = document.getElementById(elementId);
    datalist.innerHTML = '';
    dataArray.forEach(item => {
        let option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
    });
}

function toggleCheckList(listId, event) {
    event.stopPropagation();
    const ul = document.getElementById(listId);
    document.querySelectorAll('.dropdown-checklist ul.items').forEach(list => {
        if (list.id !== listId) list.style.display = 'none';
    });
    ul.style.display = (ul.style.display === 'block') ? 'none' : 'block';
}

function populateCheckboxList(listId, inputId, dataArray) {
    const ul = document.getElementById(listId);
    ul.innerHTML = '';
    dataArray.forEach(item => {
        let li = document.createElement('li');
        let label = document.createElement('label');
        let cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = item;
        cb.onchange = (e) => handleCheckboxChange(inputId, item, e.target.checked);
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + item));
        li.appendChild(label);
        ul.appendChild(li);
    });
    document.getElementById(inputId).addEventListener('input', () => syncCheckboxes(inputId, listId));
}

function handleCheckboxChange(inputId, value, isChecked) {
    const input = document.getElementById(inputId);
    let vals = input.value.split(',').map(s => s.trim()).filter(Boolean);
    if (isChecked) { if (!vals.includes(value)) vals.push(value); } 
    else { vals = vals.filter(v => v !== value); }
    input.value = vals.join(', ');
}

function syncCheckboxes(inputId, listId) {
    const input = document.getElementById(inputId);
    const vals = input.value.split(',').map(s => s.trim()).filter(Boolean);
    const checkboxes = document.getElementById(listId).querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = vals.includes(cb.value));
}

function toggleWeekendOpts() {
    const hourMode = document.querySelector('input[name="hourMode"]:checked').value;
    const weekendOpts = document.getElementById('weekendOpts');
    weekendOpts.style.display = (hourMode === 'average') ? 'block' : 'none';
}

function calculateTotalHours(startStr, endStr, baseHours, hourMode, weekendMode) {
    if (hourMode === 'total') return baseHours;
    if (!startStr) return baseHours; 
    let end = endStr ? endStr : startStr;
    let startD = new Date(startStr + 'T00:00:00'); 
    let endD = new Date(end + 'T00:00:00');
    let daysCount = 0;
    let currentD = new Date(startD);
    while (currentD <= endD) {
        let dayOfWeek = currentD.getDay(); 
        if (weekendMode === 'yes' || (dayOfWeek !== 0 && dayOfWeek !== 6)) daysCount++;
        currentD.setDate(currentD.getDate() + 1);
    }
    return daysCount * baseHours;
}

// --- HIGHLIGHT MISSING XML DATA ---
function highlightMissingXMLFields() {
    const inputs = document.querySelectorAll('#logEntrySection input[type="text"], #logEntrySection input[type="date"], #logEntrySection input[type="number"], #logEntrySection textarea');
    inputs.forEach(input => {
        if (!input.value || input.value.trim() === "" || input.value.trim().toUpperCase() === "N/A") {
            input.classList.add('xml-missing');
        } else {
            input.classList.remove('xml-missing');
        }
    });
}

// --- LOAD PREVIOUS TOOLS ---
function loadPreviousTools() {
    const select = document.getElementById('prevLogSelect');
    const logId = select.value;
    
    if (!logId) {
        alert("Please select a previous log entry from the dropdown first.");
        return;
    }
    
    const log = projectLogs.find(l => l.id === logId);
    if (!log) return;
    
    document.getElementById('activityCategoryInput').value = (log.category || []).join(', ');
    syncCheckboxes('activityCategoryInput', 'activityCategoryList');
    
    const vTypeStr = Array.isArray(log.vesselType) ? log.vesselType.join(', ') : (log.vesselType || '');
    document.getElementById('vesselTypeInput').value = vTypeStr;
    syncCheckboxes('vesselTypeInput', 'vesselTypeList');

    document.getElementById('equipmentInput').value = (log.systemsUsed || []).join(', ');
    syncCheckboxes('equipmentInput', 'equipmentList');
    
    document.getElementById('softwareInput').value = (log.softwareUsed || []).join(', ');
    syncCheckboxes('softwareInput', 'softwareList');
}

function resetCustomInputs() {
    document.getElementById('activityCategoryInput').value = '';
    document.getElementById('vesselTypeInput').value = '';
    document.getElementById('equipmentInput').value = '';
    document.getElementById('softwareInput').value = '';
    document.querySelectorAll('.dropdown-checklist input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Remove yellow highlights
    document.querySelectorAll('.xml-missing').forEach(el => el.classList.remove('xml-missing'));
}

// --- EDIT LOGIC ---
function editEntry(id) {
    const log = projectLogs.find(l => l.id === id);
    if(!log) return;

    document.getElementById('projectName').value = log.projectName || '';
    document.getElementById('jobTitle').value = log.jobTitle || '';
    document.getElementById('geographicLocation').value = log.geoLoc || '';
    document.getElementById('projectDescription').value = log.projectDescription || '';
    document.getElementById('organization').value = log.organization || '';
    document.getElementById('startDate').value = log.startDate || '';
    document.getElementById('endDate').value = log.endDate || '';
    document.getElementById('activityHours').value = log.hoursInputBase || log.hours || '';
    document.getElementById('activityPerformed').value = log.activity || '';
    document.getElementById('fieldUnit').value = log.fieldUnit || '';

    const vTypeStr = Array.isArray(log.vesselType) ? log.vesselType.join(', ') : (log.vesselType || '');
    document.getElementById('vesselTypeInput').value = vTypeStr;
    syncCheckboxes('vesselTypeInput', 'vesselTypeList');

    document.querySelectorAll('input[name="hourMode"]').forEach(r => r.checked = (r.value === (log.hourMode || 'total')));
    document.querySelectorAll('input[name="weekendMode"]').forEach(r => r.checked = (r.value === (log.weekendMode || 'no')));
    toggleWeekendOpts(); 

    document.getElementById('activityCategoryInput').value = (log.category || []).join(', ');
    syncCheckboxes('activityCategoryInput', 'activityCategoryList');

    document.getElementById('equipmentInput').value = (log.systemsUsed || []).join(', ');
    syncCheckboxes('equipmentInput', 'equipmentList');

    document.getElementById('softwareInput').value = (log.softwareUsed || []).join(', ');
    syncCheckboxes('softwareInput', 'softwareList');

    document.querySelectorAll('.xml-missing').forEach(el => el.classList.remove('xml-missing'));

    currentEditId = id;
    const btn = document.getElementById('submitBtn');
    btn.textContent = '💾 Update Entry';
    btn.style.backgroundColor = '#f39c12';
    document.getElementById('cancelEditBtn').style.display = 'block';
    document.getElementById('logEntrySection').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    currentEditId = null;
    const btn = document.getElementById('submitBtn');
    btn.textContent = '+ Add Entry to Project';
    btn.style.backgroundColor = 'var(--primary)';
    document.getElementById('cancelEditBtn').style.display = 'none';
    
    document.getElementById('activityHours').value = '';
    document.getElementById('activityPerformed').value = '';
    resetCustomInputs();
}

function addLogEntry() {
    const projectName = document.getElementById('projectName').value;
    const jobTitle = document.getElementById('jobTitle').value;
    const geoLoc = document.getElementById('geographicLocation').value;
    const projectDescription = document.getElementById('projectDescription').value;
    const organization = document.getElementById('organization').value;
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const activityHoursInput = parseFloat(document.getElementById('activityHours').value) || 0;
    const hourMode = document.querySelector('input[name="hourMode"]:checked').value;
    const weekendMode = document.querySelector('input[name="weekendMode"]:checked').value;
    
    const activityPerformed = document.getElementById('activityPerformed').value;
    const fieldUnit = document.getElementById('fieldUnit').value;
    
    const vesselType = document.getElementById('vesselTypeInput').value.split(',').map(s=>s.trim()).filter(Boolean);
    const activityCategory = document.getElementById('activityCategoryInput').value.split(',').map(s=>s.trim()).filter(Boolean);
    const equipment = document.getElementById('equipmentInput').value.split(',').map(s=>s.trim()).filter(Boolean);
    const software = document.getElementById('softwareInput').value.split(',').map(s=>s.trim()).filter(Boolean);

    if (!organization) return alert("Please enter an Organization.");
    if(activityHoursInput <= 0) return alert("Please enter valid activity hours.");

    if (startDate && endDate) {
        const startD = new Date(startDate + 'T00:00:00'); 
        const endD = new Date(endDate + 'T00:00:00');
        if (startD > endD) return alert("Error: Your Start Date cannot be after your End Date.");
        
        const rawDays = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        const maxPossibleHours = rawDays * 24;
        if (hourMode === 'total' && activityHoursInput > maxPossibleHours) {
            return alert(`Error: You logged ${activityHoursInput} Total Hours, but there are only ${maxPossibleHours} hours mathematically possible between those dates.`);
        }
    }

    if (hourMode === 'average' && activityHoursInput > 24) return alert("Error: You cannot average more than 24 hours per day.");

    const calculatedTotalHours = calculateTotalHours(startDate, endDate, activityHoursInput, hourMode, weekendMode);

    let dateDisplay = startDate;
    if (startDate && endDate && startDate !== endDate) dateDisplay = `${startDate} to ${endDate}`;
    else if (!startDate && endDate) dateDisplay = endDate; 
    else if (!startDate && !endDate) dateDisplay = "No Date Provided";

    const entry = {
        id: currentEditId ? currentEditId : Date.now().toString(),
        projectName: projectName,
        jobTitle: jobTitle,
        geoLoc: geoLoc,
        projectDescription: projectDescription,
        organization: organization,
        date: dateDisplay, 
        startDate: startDate, 
        endDate: endDate,
        category: activityCategory,
        hours: calculatedTotalHours, 
        hoursInputBase: activityHoursInput, 
        hourMode: hourMode,
        weekendMode: weekendMode,
        activity: activityPerformed,
        fieldUnit: fieldUnit,
        vesselType: vesselType,
        systemsUsed: equipment,
        softwareUsed: software
    };

    if (currentEditId) {
        const index = projectLogs.findIndex(l => l.id === currentEditId);
        if (index !== -1) projectLogs[index] = entry; 
        cancelEdit(); 
    } else {
        projectLogs.push(entry);
        document.getElementById('activityHours').value = '';
        document.getElementById('activityPerformed').value = '';
        resetCustomInputs();
    }
    updateTable();
}

function removeEntry(id) {
    projectLogs = projectLogs.filter(log => log.id !== id);
    updateTable();
}

function updateTable() {
    const tbody = document.querySelector('#logTable tbody');
    tbody.innerHTML = '';
    let totalHours = 0;

    const prevSelect = document.getElementById('prevLogSelect');
    prevSelect.innerHTML = '<option value="">Select a previous log...</option>';

    projectLogs.forEach(log => {
        totalHours += log.hours;
        
        const opt = document.createElement('option');
        opt.value = log.id;
        opt.textContent = `${sanitizeHTML(log.projectName || 'Unnamed')} - ${sanitizeHTML(log.date)}`;
        prevSelect.appendChild(opt);

        const vTypeStr = Array.isArray(log.vesselType) ? log.vesselType.join(', ') : (log.vesselType || '');
        const tr = document.createElement('tr');
        
        // Secured DOM Injection
        tr.innerHTML = `
            <td><strong>${sanitizeHTML(log.organization || 'N/A')}</strong></td>
            <td>${sanitizeHTML(log.projectName || 'N/A')}</td>
            <td>${sanitizeHTML(log.geoLoc || 'N/A')}</td>
            <td>${sanitizeHTML(log.date)}</td>
            <td>${sanitizeHTML((log.category || []).join(', '))}</td>
            <td>${log.hours}</td>
            <td>${sanitizeHTML(log.fieldUnit)} (${sanitizeHTML(vTypeStr)})</td>
            <td>${sanitizeHTML((log.systemsUsed || []).join(', '))}</td>
            <td>${sanitizeHTML((log.softwareUsed || []).join(', '))}</td>
            <td>${sanitizeHTML(log.activity)}</td>
            <td style="white-space: nowrap;">
                <button style="background:#f39c12; padding: 5px 10px; margin:0 5px 0 0;" onclick="editEntry('${sanitizeHTML(log.id)}')" title="Edit Entry">✎</button>
                <button style="background:red; padding: 5px 10px; margin:0;" onclick="removeEntry('${sanitizeHTML(log.id)}')" title="Delete Entry">X</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('totalHours').textContent = totalHours;
}

// --- Import NOAA XML Metadata Logic ---
function loadNOAAXML(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

            function getLocalNodes(parent, name) {
                let results = [];
                if (!parent) return results;
                let elements = parent.getElementsByTagName('*');
                let lowerName = name.toLowerCase();
                for (let i = 0; i < elements.length; i++) {
                    let el = elements[i];
                    let localName = (el.localName || el.tagName.split(':').pop() || "").toLowerCase();
                    if (localName === lowerName) results.push(el);
                }
                return results;
            }

            const isPI = getLocalNodes(xmlDoc, "hydrographicSurveyPI").length > 0;
            const is2026Metadata = getLocalNodes(xmlDoc, "surveyMetadata").length > 0 && getLocalNodes(xmlDoc, "equipmentList").length > 0;
            const isLegacyDR = getLocalNodes(xmlDoc, "descriptiveReport").length > 0;

            let parsedTitle = "";

            if (isPI) {
                // PARSE PROJECT INSTRUCTIONS 2026
                const pId = getLocalNodes(xmlDoc, "uniqueId")[0]?.textContent.trim();
                const pName = getLocalNodes(xmlDoc, "name")[0]?.textContent.trim();
                document.getElementById('projectName').value = [pId, pName].filter(Boolean).join(", ") || "N/A";

                let states = getLocalNodes(xmlDoc, "state").map(n => n.textContent.trim());
                let geoLocParts = [pName, ...states].filter(Boolean);
                document.getElementById('geographicLocation').value = geoLocParts.join(", ") || "N/A";

                document.getElementById('projectDescription').value = getLocalNodes(xmlDoc, "purpose")[0]?.textContent.trim() || "N/A";
                document.getElementById('fieldUnit').value = getLocalNodes(xmlDoc, "fieldUnit")[0]?.textContent.trim() || "N/A";
                document.getElementById('equipmentInput').value = "N/A";

                parsedTitle = "NOAA Project Instructions XML";

            } else if (is2026Metadata) {
                // PARSE 2026 METADATA
                const fieldUnitNodes = getLocalNodes(xmlDoc, "fieldUnit");
                document.getElementById('fieldUnit').value = fieldUnitNodes.length > 0 && fieldUnitNodes[0].textContent.trim() !== "" 
                    ? fieldUnitNodes[0].textContent.trim() : "N/A";

                let projParts = [];
                const projectNodes = getLocalNodes(xmlDoc, "project");
                let pName = "";
                if (projectNodes.length > 0) {
                    const pId = getLocalNodes(projectNodes[0], "uniqueId")[0]?.textContent.trim();
                    pName = getLocalNodes(projectNodes[0], "name")[0]?.textContent.trim();
                    if (pId) projParts.push(pId);
                    if (pName) projParts.push(pName);
                }
                const surveyNodes = getLocalNodes(xmlDoc, "survey");
                if (surveyNodes.length > 0) {
                    const sId = getLocalNodes(surveyNodes[0], "uniqueId")[0]?.textContent.trim();
                    if (sId) projParts.push(sId);
                }
                document.getElementById('projectName').value = projParts.length > 0 ? projParts.join(", ") : "N/A";

                let states = getLocalNodes(xmlDoc, "state").map(n => n.textContent.trim());
                let geoLocParts = [pName, ...states].filter(Boolean);
                document.getElementById('geographicLocation').value = geoLocParts.join(", ") || "N/A";
                document.getElementById('projectDescription').value = "Fill this out using the PI or other means not found in the Metadata report";

                let systemsSet = new Set();
                ["positioningSystem", "depthHeightSensor", "soundSpeedSensor"].forEach(cat => {
                    getLocalNodes(xmlDoc, cat).forEach(node => {
                        getLocalNodes(node, "systemName").forEach(sys => {
                            const txt = sys.textContent.trim();
                            if (txt && txt.toUpperCase() !== "NA" && txt.toUpperCase() !== "N/A") systemsSet.add(txt);
                        });
                    });
                });
                const systemsStr = Array.from(systemsSet).join(", ");
                document.getElementById('equipmentInput').value = systemsStr !== "" ? systemsStr : "N/A";
                syncCheckboxes('equipmentInput', 'equipmentList'); 

                const dates = getLocalNodes(xmlDoc, "date");
                if (dates.length > 0) {
                    const startNode = getLocalNodes(dates[0], "start")[0];
                    const endNode = getLocalNodes(dates[0], "end")[0];
                    if (startNode) document.getElementById('startDate').value = startNode.textContent.trim();
                    if (endNode) document.getElementById('endDate').value = endNode.textContent.trim();
                }

                parsedTitle = "NOAA 2026 Metadata XML";

            } else if (isLegacyDR) {
                // PARSE LEGACY DESCRIPTIVE REPORT (Pre-2024)
                let projParts = [];
                const projMetaNodes = getLocalNodes(xmlDoc, "projectMetadata");
                if (projMetaNodes.length > 0) {
                    const pId = getLocalNodes(projMetaNodes[0], "number")[0]?.textContent.trim();
                    const pName = getLocalNodes(projMetaNodes[0], "name")[0]?.textContent.trim();
                    if (pId) projParts.push(pId);
                    if (pName) projParts.push(pName);
                }
                const regMetaNodes = getLocalNodes(xmlDoc, "registryMetadata");
                if (regMetaNodes.length > 0) {
                    const sId = getLocalNodes(regMetaNodes[0], "registryNumber")[0]?.textContent.trim();
                    if (sId) projParts.push(sId);
                }
                document.getElementById('projectName').value = projParts.length > 0 ? projParts.join(", ") : "N/A";

                let geoLocParts = [];
                if (regMetaNodes.length > 0) {
                    const subLoc = getLocalNodes(regMetaNodes[0], "sublocality")[0]?.textContent.trim();
                    const stateTerr = getLocalNodes(regMetaNodes[0], "stateOrTerritory")[0]?.textContent.trim();
                    if (subLoc) geoLocParts.push(subLoc);
                    if (stateTerr) geoLocParts.push(stateTerr);
                }
                document.getElementById('geographicLocation').value = geoLocParts.length > 0 ? geoLocParts.join(", ") : "N/A";

                const purposeNodes = getLocalNodes(xmlDoc, "surveyPurpose");
                if (purposeNodes.length > 0) {
                    document.getElementById('projectDescription').value = getLocalNodes(purposeNodes[0], "discussion")[0]?.textContent.trim() || "N/A";
                } else {
                    document.getElementById('projectDescription').value = "N/A";
                }

                if (projMetaNodes.length > 0) {
                    document.getElementById('fieldUnit').value = getLocalNodes(projMetaNodes[0], "fieldUnit")[0]?.textContent.trim() || "N/A";
                }

                let systemsSet = new Set();
                getLocalNodes(xmlDoc, "equipment").forEach(eqNode => {
                    getLocalNodes(eqNode, "majorSystem").forEach(sys => {
                        const modelName = getLocalNodes(sys, "model")[0]?.textContent.trim();
                        if (modelName && modelName.toUpperCase() !== "NA" && modelName.toUpperCase() !== "N/A") {
                            systemsSet.add(modelName);
                        }
                    });
                });
                const systemsStr = Array.from(systemsSet).join(", ");
                document.getElementById('equipmentInput').value = systemsStr !== "" ? systemsStr : "N/A";
                syncCheckboxes('equipmentInput', 'equipmentList'); 

                const datesOfSurveyNodes = getLocalNodes(xmlDoc, "datesOfSurvey");
                if (datesOfSurveyNodes.length > 0) {
                    const startNode = getLocalNodes(datesOfSurveyNodes[0], "start")[0];
                    const endNode = getLocalNodes(datesOfSurveyNodes[0], "end")[0];
                    if (startNode) document.getElementById('startDate').value = startNode.textContent.trim();
                    if (endNode) document.getElementById('endDate').value = endNode.textContent.trim();
                }

                parsedTitle = "Legacy NOAA Descriptive Report XML";

            } else {
                return alert("Unrecognized NOAA XML format. Could not parse data.");
            }

            // ==========================================
            // SKIM RAW TEXT FOR KNOWN SOFTWARE (Applies to Metadata and DR)
            // ==========================================
            let softwareAlertMsg = "";
            if (is2026Metadata || isLegacyDR) {
                const fullXmlText = xmlDoc.documentElement.textContent.toUpperCase();
                let foundSoftware = new Set();
                
                // Mappings requested by user
                const searchMap = {
                    "CARIS": "CARIS",
                    "CHARLENE": "Charlene",
                    "FLEDERMAUS": "Fledermaus",
                    "FMGT": "FMGT",
                    "HYPACK": "HYPACK",
                    "POSPAC": "POSPac",
                    "PYDRO": "Pydro (all others)",
                    "QC TOOL": "QC Tools",
                    "QIMERA": "Qimera",
                    "SIS4": "SIS5",
                    "SIS5": "SIS5",
                    "KONGSBERG": "SIS5",
                    "SOUND SPEED MANAGER": "Sound Speed Manager"
                };

                for (const [searchTerm, uiLabel] of Object.entries(searchMap)) {
                    if (fullXmlText.includes(searchTerm)) {
                        foundSoftware.add(uiLabel);
                    }
                }

                if (foundSoftware.size > 0) {
                    const softStr = Array.from(foundSoftware).join(", ");
                    document.getElementById('softwareInput').value = softStr;
                    syncCheckboxes('softwareInput', 'softwareList');
                    softwareAlertMsg = `\n\n⚠️ AUTOMATED SOFTWARE CHECK:\nWe skimmed the report and found mentions of: ${softStr}.\n\nPlease note: This is just a heuristic text check and may not be a complete or accurate list of the software YOU specifically used. Verify before saving!`;
                }
            }

            alert(`${parsedTitle} parsed successfully!${softwareAlertMsg}`);

            // Highlight empty fields so user fills them out!
            highlightMissingXMLFields();

        } catch (error) {
            console.error("Error parsing NOAA XML:", error);
            alert("Failed to parse the XML file. Ensure it is a valid NOAA metadata XML.");
        }
        
        event.target.value = '';
    };
    reader.readAsText(file);
}

function loadProjectJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.logbookEntries) {
                document.getElementById('userName').value = data.userName || '';
                document.getElementById('userEmail').value = data.userEmail || '';
                
                projectLogs = data.logbookEntries;
                updateTable();

                if(projectLogs.length > 0) {
                    const last = projectLogs[projectLogs.length - 1];
                    document.getElementById('projectName').value = last.projectName || '';
                    document.getElementById('jobTitle').value = last.jobTitle || '';
                    document.getElementById('geographicLocation').value = last.geoLoc || '';
                    document.getElementById('projectDescription').value = last.projectDescription || '';
                    document.getElementById('organization').value = last.organization || '';
                }

                alert("Project JSON loaded successfully!");
            } else {
                alert("The selected JSON does not match the expected Logbook format.");
            }
        } catch (error) {
            console.error("Error parsing JSON:", error);
            alert("Failed to parse the JSON file. Ensure it is not corrupted.");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// --- EXPORT LOGIC: JSON ---
function exportProjectJSON() {
    const userName = document.getElementById('userName').value || "No_Name_Provided";
    const userEmail = document.getElementById('userEmail').value || "No_Email_Provided";
    
    if (projectLogs.length === 0) return alert("Add at least one log entry before exporting!");

    const projectData = {
        id: "proj_" + Date.now().toString(),
        userName: userName,
        userEmail: userEmail,
        totalProjectHours: projectLogs.reduce((sum, log) => sum + log.hours, 0),
        logbookEntries: projectLogs, 
        exportDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 4));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${userName.replace(/\s+/g, '_')}_NOAAlogbook.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// --- EXPORT LOGIC: CSV (Secured) ---
function exportLogbookCSV() {
    if (projectLogs.length === 0) return alert("Add at least one log entry before exporting!");

    const headers = ["Organization", "Project", "Geographic Location", "Date(s)", "Category", "Hours", "Field Unit", "Systems", "Software", "Activity"];
    let csvRows = [headers.join(",")];

    projectLogs.forEach(log => {
        // Secured CSV injection inputs
        const org = `"${sanitizeCSV(log.organization || '').replace(/"/g, '""')}"`;
        const proj = `"${sanitizeCSV(log.projectName || '').replace(/"/g, '""')}"`;
        const geoLoc = `"${sanitizeCSV(log.geoLoc || '').replace(/"/g, '""')}"`;
        const dates = `"${sanitizeCSV(log.date || '').replace(/"/g, '""')}"`;
        const cat = `"${sanitizeCSV((log.category || []).join(', ')).replace(/"/g, '""')}"`;
        const hours = log.hours;
        
        const vTypeStr = Array.isArray(log.vesselType) ? log.vesselType.join(', ') : (log.vesselType || '');
        const fieldUnitCombined = log.fieldUnit ? `${log.fieldUnit} (${vTypeStr})` : '';
        const fieldUnit = `"${sanitizeCSV(fieldUnitCombined).replace(/"/g, '""')}"`;
        
        const systems = `"${sanitizeCSV((log.systemsUsed || []).join(', ')).replace(/"/g, '""')}"`;
        const software = `"${sanitizeCSV((log.softwareUsed || []).join(', ')).replace(/"/g, '""')}"`;
        const activity = `"${sanitizeCSV(log.activity || '').replace(/"/g, '""')}"`;

        csvRows.push([org, proj, geoLoc, dates, cat, hours, fieldUnit, systems, software, activity].join(","));
    });

    const userName = document.getElementById('userName').value || "Logbook";
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    nativeSaveAs(blob, `${userName.replace(/\s+/g, '_')}_Logbook.csv`);
}

// --- EXPORT LOGIC: DOCX Mega Document ---
function exportLogbookDoc() {
    if (projectLogs.length === 0) return alert("Add at least one log entry before exporting!");

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, PageBreak } = docx;

    const orgs = {};
    projectLogs.forEach(log => {
        const orgName = log.organization || "Unknown Organization";
        const projName = log.projectName || "Unknown Project";

        if (!orgs[orgName]) orgs[orgName] = {};
        if (!orgs[orgName][projName]) orgs[orgName][projName] = [];
        orgs[orgName][projName].push(log);
    });

    const docChildren = [];
    let isFirstOrg = true;

    for (const [orgName, projects] of Object.entries(orgs)) {
        if (!isFirstOrg) docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        isFirstOrg = false;

        docChildren.push(new Paragraph({
            text: orgName,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 }
        }));

        for (const [projName, logs] of Object.entries(projects)) {
            docChildren.push(new Paragraph({
                text: projName,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 }
            }));

            const projHours = logs.reduce((sum, l) => sum + l.hours, 0);
            docChildren.push(new Paragraph({
                children: [
                    new TextRun({ text: "Total Hours: ", bold: true }),
                    new TextRun(`${projHours}`)
                ],
                spacing: { after: 200 }
            }));

            const tableRows = [
                new TableRow({
                    children: ["Date(s)", "Geo Loc", "Category", "Hours", "Field Unit", "Activity", "Systems/Soft"].map(text => 
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: text, color: "FFFFFF", bold: true, size: 20 })] })],
                            shading: { fill: "0055a4" },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                        })
                    )
                })
            ];

            logs.forEach(log => {
                const sysSoftText = `Sys: ${(log.systemsUsed || []).join(', ')}\nSoft: ${(log.softwareUsed || []).join(', ')}`;
                const vTypeStr = Array.isArray(log.vesselType) ? log.vesselType.join(', ') : (log.vesselType || '');
                
                tableRows.push(new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({text: log.date || '', size: 20})], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                        new TableCell({ children: [new Paragraph({text: log.geoLoc || '', size: 20})], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                        new TableCell({ children: [new Paragraph({text: (log.category || []).join(', '), size: 20})], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                        new TableCell({ children: [new Paragraph({text: log.hours.toString(), size: 20})], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                        new TableCell({ children: [new Paragraph({text: `${log.fieldUnit || ''} (${vTypeStr})`, size: 20})], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                        new TableCell({ children: [new Paragraph({text: log.activity || '', size: 20})], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                        new TableCell({ children: [new Paragraph({text: sysSoftText, size: 20})], margins: { top: 100, bottom: 100, left: 100, right: 100 } })
                    ]
                }));
            });

            docChildren.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        }
    }

    const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
    Packer.toBlob(doc).then(blob => {
        const userName = document.getElementById('userName').value || "Logbook";
        nativeSaveAs(blob, `${userName.replace(/\s+/g, '_')}_Logbook.docx`);
    });
}

// --- Export Logic (Certification App Conversion) ---
function convertToCertificationJSON() {
    if (projectLogs.length === 0) return alert("Add at least one log entry to convert to Certification format.");

    const applicant = document.getElementById('userName').value || "No_Name_Provided";
    const email = document.getElementById('userEmail').value || "";

    const groupedLogs = {};
    
    projectLogs.forEach(log => {
        const org = log.organization || "Unknown Organization";
        
        if (!groupedLogs[org]) {
            groupedLogs[org] = {
                jobTitles: new Set(),
                j_projs: new Set(),
                j_resps: new Set(),
                systems: new Set(),
                software: new Set(),
                geoLocs: new Set(),
                dates: []
            };
        }
        
        if (log.startDate) groupedLogs[org].dates.push(new Date(log.startDate + 'T00:00:00').getTime());
        if (log.endDate) groupedLogs[org].dates.push(new Date(log.endDate + 'T00:00:00').getTime());

        if (log.jobTitle && log.jobTitle.trim() !== '') groupedLogs[org].jobTitles.add(log.jobTitle.trim());
        if (log.geoLoc && log.geoLoc.trim() !== '') groupedLogs[org].geoLocs.add(log.geoLoc.trim());

        const pName = log.projectName || "Unknown Project";
        const pDesc = log.projectDescription || "No description provided.";
        const pAct = log.activity || "None";
        const pStart = log.startDate || "Unknown Start Date";
        const pEnd = log.endDate || (log.startDate ? log.startDate : "Unknown End Date");
        const pCategory = (log.category && log.category.length > 0) ? log.category.join(', ') : "None";
        
        groupedLogs[org].j_projs.add(`${pName} - ${pDesc}`);

        const respString = `From ${pStart} to ${pEnd} for ${pName}: daily activities: ${pCategory}, detailed activities: ${pAct}`;
        groupedLogs[org].j_resps.add(respString);

        (log.systemsUsed || []).forEach(sys => { if(sys) groupedLogs[org].systems.add(sys.trim()); });
        (log.softwareUsed || []).forEach(soft => { if(soft) groupedLogs[org].software.add(soft.trim()); });
    });

    const certDataArray = [];
    let e_number = 1;

    for (const [org, data] of Object.entries(groupedLogs)) {
        let d_from = "";
        let d_to = "";
        
        if (data.dates.length > 0) {
            const minTime = Math.min(...data.dates);
            const maxTime = Math.max(...data.dates);
            d_from = new Date(minTime).toISOString().split('T')[0];
            d_to = new Date(maxTime).toISOString().split('T')[0];
        }

        let j_proj_text = Array.from(data.j_projs).join('\n');
        let j_resp_text = Array.from(data.j_resps).join('\n');
        let geo_loc_text = Array.from(data.geoLocs).join(' / ');

        certDataArray.push({
            "e_number": String(e_number++),
            "engagement_type": "PE", 
            "f_name": org,
            "f_addr": "", 
            "s_name": "",
            "s_addr": "",
            "d_from": d_from,
            "d_to": d_to,
            "j_title": Array.from(data.jobTitles).join(' / '), 
            "geo_loc": geo_loc_text,
            "j_proj": j_proj_text, 
            "j_resp": j_resp_text, 
            "d_gaps": "", 
            "f_email": "",
            "f_tel": "",
            "s_email": "",
            "s_tel": "",
            "j_equip": Array.from(data.systems).join(", "),
            "j_soft": Array.from(data.software).join(", "),
            "Edu_number": "0",
            "not_hydro_eng": "0",
            "Hydro_time": "", 
            "H_in_field": "", 
            "H_charge": "0"
        });
    }

    const certJSON = {
        "applicant": applicant,
        "email": email,
        "level": "Level II", 
        "data": certDataArray
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(certJSON, null, 4));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${applicant.replace(/\s+/g, '_')}_Certification.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
