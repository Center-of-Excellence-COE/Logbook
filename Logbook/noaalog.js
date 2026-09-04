const tierList = ["Tier 1", "Tier 2", "Tier 3", "HIC (Legacy)", "IHO CAT-A", "IHO CAT-B", "US - Certified Hydrographer", "US - Certified Master Hydrographer"];
const defaultActivityList = ["Acquisition", "Processing", "Planning", "Integration"];
const vesselTypesArray = ["Ship", "Launch", "Small Boat (under 65 feet)", "UxS", "Other", "N/A"];
const fieldUnitList = ["Land-based", "Bell M. Shimada", "Fairweather", "Ferdinand R. Hassler", "Gordon Gunter", "Henry B. Bigelow", "Nancy Foster", "NRT Fernandina", "NRT Gulfport", "NRT New London", "NRT Patuxent", "NRT Seattle", "Okeanos Explorer", "Oregon II", "Oscar Dyson", "Oscar Elton Sette", "Pisces", "Rainier", "Reuben Lasker", "Ronald H. Brown", "Thomas Jefferson"];
const equipmentList = ["N/A", "EM122", "EM124", "EM302", "EM304", "EM710", "EM712", "EM2040", "EM2040C", "EK60", "EK80", "ME70", "Klein 500", "Klein 5000", "SBP29"];
const softwareList = ["N/A", "CARIS", "Charlene", "Fledermaus", "FMGT", "HYPACK", "POSPac", "Pydro (all others)", "QC Tools", "Qimera", "SIS5", "Sound Speed Manager"];

let projectLogs = [];
let currentEditId = null; 

// Store breakdown inputs as user types them
let breakdownState = { activity: {}, vessel: {}, equipment: {}, software: {} };

// --- SECURITY & BACKWARD COMPATIBILITY HELPERS ---
function ensureArray(val) {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
}

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
    if (/^[=+\-@]/.test(s)) s = "'" + s; 
    return s;
}

// Helper to append percentages to text strings (e.g., "CARIS (80%)")
function formatWithBreakdown(items, breakdown) {
    if (!items || items.length === 0) return "";
    return items.map(item => {
        if (breakdown && breakdown[item] && breakdown[item].trim() !== "") {
            return `${item} (${breakdown[item]}%)`;
        }
        return item;
    }).join(', ');
}

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
    
    populateCheckboxList('currentQualList', 'currentQualSelect', tierList);
    populateCheckboxList('activityList', 'activityInput', defaultActivityList, 'activity');
    populateCheckboxList('vesselTypeList', 'vesselTypeInput', vesselTypesArray, 'vessel');
    populateCheckboxList('equipmentList', 'equipmentInput', equipmentList, 'equipment');
    populateCheckboxList('softwareList', 'softwareInput', softwareList, 'software');
    
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

function populateCheckboxList(listId, inputId, dataArray, breakdownType = null) {
    const ul = document.getElementById(listId);
    ul.innerHTML = '';
    dataArray.forEach(item => {
        let li = document.createElement('li');
        let label = document.createElement('label');
        let cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = item;
        cb.onchange = (e) => handleCheckboxChange(inputId, item, e.target.checked, breakdownType);
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + item));
        li.appendChild(label);
        ul.appendChild(li);
    });
    document.getElementById(inputId).addEventListener('input', () => syncCheckboxes(inputId, listId, breakdownType));
}

function handleCheckboxChange(inputId, value, isChecked, breakdownType) {
    const input = document.getElementById(inputId);
    let vals = input.value.split(',').map(s => s.trim()).filter(Boolean);
    if (isChecked) { if (!vals.includes(value)) vals.push(value); } 
    else { vals = vals.filter(v => v !== value); }
    input.value = vals.join(', ');
    if (breakdownType) renderBreakdownUI(breakdownType, inputId);
}

function syncCheckboxes(inputId, listId, breakdownType) {
    const input = document.getElementById(inputId);
    const vals = input.value.split(',').map(s => s.trim()).filter(Boolean);
    const checkboxes = document.getElementById(listId).querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = vals.includes(cb.value));
    if (breakdownType) renderBreakdownUI(breakdownType, inputId);
}

// --- OPTIONAL BREAKDOWN UI RENDERER (PERCENTAGES) ---
function renderBreakdownUI(type, inputId) {
    const input = document.getElementById(inputId);
    const values = input.value.split(',').map(s => s.trim()).filter(Boolean);
    const container = document.getElementById(type + 'Breakdown');
    if(!container) return;
    
    container.innerHTML = '';
    
    if (values.length > 1) {
        let label = document.createElement('div');
        label.style.width = '100%';
        label.className = 'help-text';
        label.innerText = 'Optional Rough % Breakdown (Must equal 100%):';
        container.appendChild(label);
        
        values.forEach(val => {
            let wrap = document.createElement('div');
            wrap.className = 'breakdown-item';
            wrap.innerText = val + ': ';
            let inp = document.createElement('input');
            inp.type = 'number';
            inp.min = '0';
            inp.max = '100';
            inp.step = '1';
            inp.placeholder = '%';
            inp.value = breakdownState[type][val] || '';
            inp.oninput = (e) => { 
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                breakdownState[type][val] = e.target.value; 
            };
            wrap.appendChild(inp);
            container.appendChild(wrap);
        });
    } else if (values.length === 1) {
        breakdownState[type] = {}; 
    }
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

function loadPreviousTools() {
    const select = document.getElementById('prevLogSelect');
    const logId = select.value;
    if (!logId) return alert("Please select a previous log entry from the dropdown first.");
    
    const log = projectLogs.find(l => l.id === logId);
    if (!log) return;
    
    const actTypes = ensureArray(log.activityType || log.category);
    const vTypes = ensureArray(log.vesselType);
    const sysUsed = ensureArray(log.systemsUsed);
    const softUsed = ensureArray(log.softwareUsed);

    document.getElementById('activityInput').value = actTypes.join(', ');
    syncCheckboxes('activityInput', 'activityList', 'activity');
    
    document.getElementById('vesselTypeInput').value = vTypes.join(', ');
    syncCheckboxes('vesselTypeInput', 'vesselTypeList', 'vessel');

    document.getElementById('equipmentInput').value = sysUsed.join(', ');
    syncCheckboxes('equipmentInput', 'equipmentList', 'equipment');
    
    document.getElementById('softwareInput').value = softUsed.join(', ');
    syncCheckboxes('softwareInput', 'softwareList', 'software');
}

function resetCustomInputs() {
    document.getElementById('activityInput').value = '';
    document.getElementById('vesselTypeInput').value = '';
    document.getElementById('equipmentInput').value = '';
    document.getElementById('softwareInput').value = '';
    document.querySelectorAll('.dropdown-checklist input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    breakdownState = { activity: {}, vessel: {}, equipment: {}, software: {} };
    renderBreakdownUI('activity', 'activityInput');
    renderBreakdownUI('vessel', 'vesselTypeInput');
    renderBreakdownUI('equipment', 'equipmentInput');
    renderBreakdownUI('software', 'softwareInput');

    document.querySelectorAll('.xml-missing').forEach(el => el.classList.remove('xml-missing'));
}

function editEntry(id) {
    const log = projectLogs.find(l => l.id === id);
    if(!log) return;

    document.getElementById('projectName').value = log.projectName || '';
    document.getElementById('jobTitle').value = log.jobTitle || '';
    document.getElementById('workingTowards').value = log.workingTowards || 'Tier 1';
    document.getElementById('geographicLocation').value = log.geoLoc || '';
    document.getElementById('projectDescription').value = log.projectDescription || '';
    document.getElementById('organization').value = log.organization || '';
    document.getElementById('startDate').value = log.startDate || '';
    document.getElementById('endDate').value = log.endDate || '';
    document.getElementById('activityHours').value = log.hoursInputBase || log.hours || '';
    document.getElementById('activityDetailInput').value = log.activityDetail || log.activity || '';
    document.getElementById('fieldUnit').value = log.fieldUnit || '';

    const actTypes = ensureArray(log.activityType || log.category);
    const vTypes = ensureArray(log.vesselType);
    const sysUsed = ensureArray(log.systemsUsed);
    const softUsed = ensureArray(log.softwareUsed);

    document.getElementById('vesselTypeInput').value = vTypes.join(', ');
    document.getElementById('activityInput').value = actTypes.join(', ');
    document.getElementById('equipmentInput').value = sysUsed.join(', ');
    document.getElementById('softwareInput').value = softUsed.join(', ');
    
    document.querySelectorAll('input[name="hourMode"]').forEach(r => r.checked = (r.value === (log.hourMode || 'total')));
    document.querySelectorAll('input[name="weekendMode"]').forEach(r => r.checked = (r.value === (log.weekendMode || 'no')));
    toggleWeekendOpts(); 

    breakdownState = JSON.parse(JSON.stringify(log.breakdowns || { activity: {}, vessel: {}, equipment: {}, software: {} }));

    syncCheckboxes('activityInput', 'activityList', 'activity');
    syncCheckboxes('vesselTypeInput', 'vesselTypeList', 'vessel');
    syncCheckboxes('equipmentInput', 'equipmentList', 'equipment');
    syncCheckboxes('softwareInput', 'softwareList', 'software');

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
    document.getElementById('activityDetailInput').value = '';
    resetCustomInputs();
}

function addLogEntry() {
    const projectName = document.getElementById('projectName').value;
    const jobTitle = document.getElementById('jobTitle').value;
    const workingTowards = document.getElementById('workingTowards').value;
    const geoLoc = document.getElementById('geographicLocation').value;
    const projectDescription = document.getElementById('projectDescription').value;
    const organization = document.getElementById('organization').value;
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const activityHoursInput = parseFloat(document.getElementById('activityHours').value) || 0;
    const hourMode = document.querySelector('input[name="hourMode"]:checked').value;
    const weekendMode = document.querySelector('input[name="weekendMode"]:checked').value;
    
    const activityDetail = document.getElementById('activityDetailInput').value;
    const fieldUnit = document.getElementById('fieldUnit').value;
    
    const vesselType = document.getElementById('vesselTypeInput').value.split(',').map(s=>s.trim()).filter(Boolean);
    const activityType = document.getElementById('activityInput').value.split(',').map(s=>s.trim()).filter(Boolean);
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

    const breakdownConfigs = [
        { type: 'activity', name: 'Activity', items: activityType },
        { type: 'vessel', name: 'Vessel Type', items: vesselType },
        { type: 'equipment', name: 'System(s) Used', items: equipment },
        { type: 'software', name: 'Software Used', items: software }
    ];

    for (let b of breakdownConfigs) {
        if (b.items.length > 1) {
            let sum = 0;
            let hasValues = false;
            for (let item of b.items) {
                let val = breakdownState[b.type][item];
                if (val && val.trim() !== '') {
                    sum += parseInt(val, 10);
                    hasValues = true;
                }
            }
            if (hasValues && sum !== 100) {
                return alert(`Error: The rough percentages for ${b.name} must add up to exactly 100%. Currently, it adds up to ${sum}%. Please adjust your entries or leave them all blank to distribute the hours evenly.`);
            }
        }
    }

    const calculatedTotalHours = calculateTotalHours(startDate, endDate, activityHoursInput, hourMode, weekendMode);

    let dateDisplay = startDate;
    if (startDate && endDate && startDate !== endDate) dateDisplay = `${startDate} to ${endDate}`;
    else if (!startDate && endDate) dateDisplay = endDate; 
    else if (!startDate && !endDate) dateDisplay = "No Date Provided";

    const savedBreakdowns = JSON.parse(JSON.stringify(breakdownState));

    const entry = {
        id: currentEditId ? currentEditId : Date.now().toString(),
        projectName: projectName,
        jobTitle: jobTitle,
        workingTowards: workingTowards,
        geoLoc: geoLoc,
        projectDescription: projectDescription,
        organization: organization,
        date: dateDisplay, 
        startDate: startDate, 
        endDate: endDate,
        activityType: activityType, 
        hours: calculatedTotalHours, 
        hoursInputBase: activityHoursInput, 
        hourMode: hourMode,
        weekendMode: weekendMode,
        activityDetail: activityDetail, 
        fieldUnit: fieldUnit,
        vesselType: vesselType,
        systemsUsed: equipment,
        softwareUsed: software,
        breakdowns: savedBreakdowns
    };

    if (currentEditId) {
        const index = projectLogs.findIndex(l => l.id === currentEditId);
        if (index !== -1) projectLogs[index] = entry; 
        cancelEdit(); 
    } else {
        projectLogs.push(entry);
        document.getElementById('activityHours').value = '';
        document.getElementById('activityDetailInput').value = '';
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

        // Format items with their percentages for the UI table
        const vTypesStr = formatWithBreakdown(ensureArray(log.vesselType), log.breakdowns?.vessel);
        const actTypesStr = formatWithBreakdown(ensureArray(log.activityType || log.category), log.breakdowns?.activity);
        const sysUsedStr = formatWithBreakdown(ensureArray(log.systemsUsed), log.breakdowns?.equipment);
        const softUsedStr = formatWithBreakdown(ensureArray(log.softwareUsed), log.breakdowns?.software);
        
        const actDetail = log.activityDetail || log.activity || '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${sanitizeHTML(log.workingTowards || 'N/A')}</strong></td>
            <td>${sanitizeHTML(log.projectName || 'N/A')}</td>
            <td>${sanitizeHTML(log.geoLoc || 'N/A')}</td>
            <td>${sanitizeHTML(log.date)}</td>
            <td>${sanitizeHTML(actTypesStr)}</td>
            <td>${log.hours}</td>
            <td>${sanitizeHTML(log.fieldUnit)} (${sanitizeHTML(vTypesStr)})</td>
            <td>${sanitizeHTML(sysUsedStr)}</td>
            <td>${sanitizeHTML(softUsedStr)}</td>
            <td>${sanitizeHTML(actDetail)}</td>
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
                const fieldUnitNodes = getLocalNodes(xmlDoc, "fieldUnit");
                document.getElementById('fieldUnit').value = fieldUnitNodes.length > 0 && fieldUnitNodes[0].textContent.trim() !== "" ? fieldUnitNodes[0].textContent.trim() : "N/A";

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
                syncCheckboxes('equipmentInput', 'equipmentList', 'equipment'); 

                const dates = getLocalNodes(xmlDoc, "date");
                if (dates.length > 0) {
                    const startNode = getLocalNodes(dates[0], "start")[0];
                    const endNode = getLocalNodes(dates[0], "end")[0];
                    if (startNode) document.getElementById('startDate').value = startNode.textContent.trim();
                    if (endNode) document.getElementById('endDate').value = endNode.textContent.trim();
                }
                parsedTitle = "NOAA 2026 Metadata XML";

            } else if (isLegacyDR) {
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
                syncCheckboxes('equipmentInput', 'equipmentList', 'equipment'); 

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

            let softwareAlertMsg = "";
            if (is2026Metadata || isLegacyDR) {
                const fullXmlText = xmlDoc.documentElement.textContent.toUpperCase();
                let foundSoftware = new Set();
                
                const searchMap = {
                    "CARIS": "CARIS", "CHARLENE": "Charlene", "FLEDERMAUS": "Fledermaus",
                    "FMGT": "FMGT", "HYPACK": "HYPACK", "POSPAC": "POSPac",
                    "PYDRO": "Pydro (all others)", "QC TOOL": "QC Tools",
                    "QIMERA": "Qimera", "SIS4": "SIS5", "SIS5": "SIS5",
                    "KONGSBERG": "SIS5", "SOUND SPEED MANAGER": "Sound Speed Manager"
                };

                for (const [searchTerm, uiLabel] of Object.entries(searchMap)) {
                    if (fullXmlText.includes(searchTerm)) foundSoftware.add(uiLabel);
                }

                if (foundSoftware.size > 0) {
                    const softStr = Array.from(foundSoftware).join(", ");
                    document.getElementById('softwareInput').value = softStr;
                    syncCheckboxes('softwareInput', 'softwareList', 'software');
                    softwareAlertMsg = `\n\n⚠️ AUTOMATED SOFTWARE CHECK:\nWe skimmed the report and found mentions of: ${softStr}.\n\nPlease note: This is just a heuristic text check and may not be a complete or accurate list of the software YOU specifically used. Verify before saving!`;
                }
            }

            alert(`${parsedTitle} parsed successfully!${softwareAlertMsg}`);
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
                document.getElementById('currentQualSelect').value = (data.currentQualifications || []).join(', ');
                syncCheckboxes('currentQualSelect', 'currentQualList');

                projectLogs = data.logbookEntries;
                updateTable();

                if(projectLogs.length > 0) {
                    const last = projectLogs[projectLogs.length - 1];
                    document.getElementById('projectName').value = last.projectName || '';
                    document.getElementById('jobTitle').value = last.jobTitle || '';
                    document.getElementById('geographicLocation').value = last.geoLoc || '';
                    document.getElementById('projectDescription').value = last.projectDescription || '';
                    document.getElementById('organization').value = last.organization || '';
                    document.getElementById('workingTowards').value = last.workingTowards || 'Tier 1';
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
    const currentQuals = document.getElementById('currentQualSelect').value.split(',').map(s=>s.trim()).filter(Boolean);

    if (projectLogs.length === 0) return alert("Add at least one log entry before exporting!");

    const projectData = {
        id: "proj_" + Date.now().toString(),
        userName: userName,
        userEmail: userEmail,
        currentQualifications: currentQuals,
        totalProjectHours: projectLogs.reduce((sum, log) => sum + log.hours, 0),
        logbookEntries: projectLogs, 
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(projectData, null, 4)], { type: 'text/json' });
    nativeSaveAs(blob, `${userName.replace(/\s+/g, '_')}_NOAAlogbook.json`);
}

// --- EXPORT LOGIC: SUMMARY CSV ---
function exportSummaryCSV() {
    if (projectLogs.length === 0) return alert("Add at least one log entry before exporting!");

    const userName = document.getElementById('userName').value || "Applicant";
    const currentQuals = document.getElementById('currentQualSelect').value || "None";
    
    let csv = [];
    csv.push(`Name,${sanitizeCSV(userName)}`);
    csv.push(`Current Qualification(s),${sanitizeCSV(currentQuals)}`);
    csv.push("");
    csv.push("Machine Readable Data Summary");
    csv.push("Tier Working Towards,Year,Category,Item,Hours Logged (Calculated via %)");
    
    let summary = {}; 
    
    projectLogs.forEach(log => {
        const tier = log.workingTowards || "Unspecified Tier";
        const year = log.startDate ? log.startDate.split('-')[0] : "Unknown Year";
        const totalHours = log.hours || 0;
        
        if (!summary[tier]) summary[tier] = {};
        if (!summary[tier][year]) summary[tier][year] = { Activity: {}, VesselType: {}, Systems: {}, Software: {} };
        
        const tgt = summary[tier][year];
        
        function addHours(category, items, breakdown, distributeEvenly) {
            if (!items || items.length === 0) return;
            
            let hasBreakdown = false;
            if (breakdown) {
                hasBreakdown = items.some(item => breakdown[item] && breakdown[item].trim() !== "");
            }

            const defaultHours = distributeEvenly ? (totalHours / items.length) : totalHours;
            
            items.forEach(item => {
                let hrs = defaultHours;
                if (hasBreakdown && breakdown[item] && breakdown[item].trim() !== "") {
                    const pct = parseInt(breakdown[item], 10);
                    hrs = totalHours * (pct / 100);
                } else if (hasBreakdown && (!breakdown[item] || breakdown[item].trim() === "")) {
                    hrs = 0; 
                }
                
                if (!tgt[category][item]) tgt[category][item] = 0;
                tgt[category][item] += hrs;
            });
        }
        
        const actTypes = ensureArray(log.activityType || log.category);
        const vTypes = ensureArray(log.vesselType);
        const sysUsed = ensureArray(log.systemsUsed);
        const softUsed = ensureArray(log.softwareUsed);

        addHours('Activity', actTypes, log.breakdowns?.activity, true);
        addHours('VesselType', vTypes, log.breakdowns?.vessel, false);
        addHours('Systems', sysUsed, log.breakdowns?.equipment, false);
        addHours('Software', softUsed, log.breakdowns?.software, false);
    });
    
    for (const tier in summary) {
        for (const year in summary[tier]) {
            for (const cat in summary[tier][year]) {
                for (const item in summary[tier][year][cat]) {
                    csv.push(`"${tier}","${year}","${cat}","${item}",${summary[tier][year][cat][item].toFixed(2)}`);
                }
            }
        }
    }
    
    const blob = new Blob([csv.join("\n")], { type: 'text/csv' });
    nativeSaveAs(blob, `${userName.replace(/\s+/g, '_')}_Summary.csv`);
}

// --- EXPORT LOGIC: FULL CSV ---
function exportLogbookCSV() {
    if (projectLogs.length === 0) return alert("Add at least one log entry before exporting!");

    const headers = ["Tier", "Organization", "Project", "Geographic Location", "Date(s)", "Activity", "Hours", "Field Unit", "Systems", "Software", "Detail"];
    let csvRows = [headers.join(",")];

    projectLogs.forEach(log => {
        const tier = `"${sanitizeCSV(log.workingTowards || '').replace(/"/g, '""')}"`;
        const org = `"${sanitizeCSV(log.organization || '').replace(/"/g, '""')}"`;
        const proj = `"${sanitizeCSV(log.projectName || '').replace(/"/g, '""')}"`;
        const geoLoc = `"${sanitizeCSV(log.geoLoc || '').replace(/"/g, '""')}"`;
        const dates = `"${sanitizeCSV(log.date || '').replace(/"/g, '""')}"`;
        const hours = log.hours;
        
        // Use formatter to attach percentages to exported CSV fields
        const actTypesStr = formatWithBreakdown(ensureArray(log.activityType || log.category), log.breakdowns?.activity);
        const act = `"${sanitizeCSV(actTypesStr).replace(/"/g, '""')}"`;
        
        const vTypesStr = formatWithBreakdown(ensureArray(log.vesselType), log.breakdowns?.vessel);
        const fieldUnitCombined = log.fieldUnit ? `${log.fieldUnit} (${vTypesStr})` : '';
        const fieldUnit = `"${sanitizeCSV(fieldUnitCombined).replace(/"/g, '""')}"`;
        
        const sysUsedStr = formatWithBreakdown(ensureArray(log.systemsUsed), log.breakdowns?.equipment);
        const systems = `"${sanitizeCSV(sysUsedStr).replace(/"/g, '""')}"`;
        
        const softUsedStr = formatWithBreakdown(ensureArray(log.softwareUsed), log.breakdowns?.software);
        const software = `"${sanitizeCSV(softUsedStr).replace(/"/g, '""')}"`;
        
        const detailStr = log.activityDetail || log.activity || '';
        const activity = `"${sanitizeCSV(detailStr).replace(/"/g, '""')}"`;

        csvRows.push([tier, org, proj, geoLoc, dates, act, hours, fieldUnit, systems, software, activity].join(","));
    });

    const userName = document.getElementById('userName').value || "Logbook";
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    nativeSaveAs(blob, `${userName.replace(/\s+/g, '_')}_Logbook.csv`);
}

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
        const actDetail = log.activityDetail || log.activity || "None";
        const pStart = log.startDate || "Unknown Start Date";
        const pEnd = log.endDate || (log.startDate ? log.startDate : "Unknown End Date");
        
        const actTypes = ensureArray(log.activityType || log.category);
        const pCategory = (actTypes.length > 0) ? actTypes.join(', ') : "None";
        
        groupedLogs[org].j_projs.add(`${pName} - ${pDesc}`);

        const respString = `From ${pStart} to ${pEnd} for ${pName}: activities: ${pCategory}, details: ${actDetail}`;
        groupedLogs[org].j_resps.add(respString);

        const sysUsed = ensureArray(log.systemsUsed);
        sysUsed.forEach(sys => { if(sys) groupedLogs[org].systems.add(sys.trim()); });
        
        const softUsed = ensureArray(log.softwareUsed);
        softUsed.forEach(soft => { if(soft) groupedLogs[org].software.add(soft.trim()); });
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

    const blob = new Blob([JSON.stringify(certJSON, null, 4)], { type: 'text/json' });
    nativeSaveAs(blob, `${applicant.replace(/\s+/g, '_')}_Certification.json`);
}
