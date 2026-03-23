let diseases = [];
let symptoms = [];
let diseaseSymptoms = [];
let tests = [];
let diseaseTests = [];
let differential = [];
let precautions = [];
let immuneLogic = [];
let uiBodyMap = [];

let selected = [];
let topDisease = "";
let top3Diseases = [];
let finalDisease = null;
let finalEvaluation = null;
let currentRegion = null;

// ---------- Helpers ----------
function getEl(id){
  return document.getElementById(id);
}

function setText(id, text){
  const el = getEl(id);
  if(el) el.textContent = text;
}

function setHTML(id, html){
  const el = getEl(id);
  if(el) el.innerHTML = html;
}

// ---------- Pages ----------
function showPage(page){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  const pageMap = {
    patient: "patientPage",
    symptoms: "symptomPage",
    matching: "matchingPage",
    labs: "labsPage",
    labResult: "labResultPage",
    risk: "riskPage",
    report: "reportPage"
  };

  const target = getEl(pageMap[page]);
  if(target){
    target.classList.add("active");
  }
}

// ---------- Patient Preview ----------
function updatePatientPreview(){
  const name = getEl("name")?.value || "—";
  const age = getEl("age")?.value || "—";
  const gender = getEl("gender")?.value || "—";
  const caseID = getEl("caseID")?.value || "—";

  setHTML("patientPreview", `
    <div><strong>Name:</strong> ${name}</div>
    <div><strong>Age:</strong> ${age}</div>
    <div><strong>Gender:</strong> ${gender}</div>
    <div><strong>Case ID:</strong> ${caseID}</div>
  `);
}

function bindPatientInputs(){
  ["name","age","gender","caseID"].forEach(id => {
    const el = getEl(id);
    if(el){
      el.addEventListener("input", updatePatientPreview);
      el.addEventListener("change", updatePatientPreview);
    }
  });
  updatePatientPreview();
}

// ---------- Manual Database Load (kept if needed) ----------
function loadDatabase(){
  const status = getEl("dbStatus");
  const fileInput = getEl("excelFile");

  if(!fileInput || !fileInput.files.length){
    if(status) status.textContent = "Please select the Excel file first.";
    return;
  }

  if(typeof XLSX === "undefined"){
    if(status) status.textContent = "SheetJS library did not load.";
    return;
  }

  if(status) status.textContent = "Loading database...";

  const reader = new FileReader();

  reader.onerror = function(){
    if(status) status.textContent = "Failed to read file.";
  };

  reader.onload = function(e){
    try{
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });

      diseases = XLSX.utils.sheet_to_json(wb.Sheets["Diseases"] || []);
      symptoms = XLSX.utils.sheet_to_json(wb.Sheets["Symptoms"] || []);
      diseaseSymptoms = XLSX.utils.sheet_to_json(wb.Sheets["Disease_Symptoms"] || []);
      tests = XLSX.utils.sheet_to_json(wb.Sheets["Tests"] || []);
      diseaseTests = XLSX.utils.sheet_to_json(wb.Sheets["Disease_Tests"] || []);
      differential = XLSX.utils.sheet_to_json(wb.Sheets["Differential_Diagnosis"] || []);
      precautions = wb.Sheets["Precautions"] ? XLSX.utils.sheet_to_json(wb.Sheets["Precautions"]) : [];
      immuneLogic = wb.Sheets["Immune_Logic"] ? XLSX.utils.sheet_to_json(wb.Sheets["Immune_Logic"]) : [];
      uiBodyMap = wb.Sheets["UI_BodyMap"] ? XLSX.utils.sheet_to_json(wb.Sheets["UI_BodyMap"]) : [];

      if(!diseases.length || !symptoms.length){
        if(status) status.textContent = "Main sheets loaded but are empty.";
        return;
      }

      if(status){
        status.textContent = `Database Loaded Successfully (${diseases.length} diseases, ${symptoms.length} symptoms)`;
      }

      buildBodyMap();
      resetSelections();
    }catch(err){
      console.error(err);
      if(status) status.textContent = "Load failed: " + err.message;
    }
  };

  reader.readAsArrayBuffer(fileInput.files[0]);
}

// ---------- Database Auto Load ----------
async function loadDatabaseAuto(){
  const status = getEl("dbStatus");

  try{
    const response = await fetch("database.xlsx");
    if(!response.ok){
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: "array" });

    diseases = XLSX.utils.sheet_to_json(wb.Sheets["Diseases"] || []);
    symptoms = XLSX.utils.sheet_to_json(wb.Sheets["Symptoms"] || []);
    diseaseSymptoms = XLSX.utils.sheet_to_json(wb.Sheets["Disease_Symptoms"] || []);
    tests = XLSX.utils.sheet_to_json(wb.Sheets["Tests"] || []);
    diseaseTests = XLSX.utils.sheet_to_json(wb.Sheets["Disease_Tests"] || []);
    differential = XLSX.utils.sheet_to_json(wb.Sheets["Differential_Diagnosis"] || []);
    precautions = wb.Sheets["Precautions"] ? XLSX.utils.sheet_to_json(wb.Sheets["Precautions"]) : [];
    immuneLogic = wb.Sheets["Immune_Logic"] ? XLSX.utils.sheet_to_json(wb.Sheets["Immune_Logic"]) : [];
    uiBodyMap = wb.Sheets["UI_BodyMap"] ? XLSX.utils.sheet_to_json(wb.Sheets["UI_BodyMap"]) : [];

    if(!diseases.length || !symptoms.length){
      if(status) status.textContent = "Main sheets loaded but are empty.";
      return;
    }

    if(status){
      status.textContent = `Database loaded automatically ✔️ (${diseases.length} diseases, ${symptoms.length} symptoms)`;
    }

    buildBodyMap();
    resetSelections();
  }catch(err){
    console.error(err);
    if(status) status.textContent = "Failed to load database ❌";
  }
}

// ---------- Body Map ----------
function buildBodyMap(){
  const box = getEl("bodyMapButtons");
  if(!box) return;

  box.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "body-btn";
  allBtn.dataset.region = "ALL";
  allBtn.innerHTML = "✨ All";
  allBtn.onclick = () => selectRegion("ALL", allBtn);
  box.appendChild(allBtn);

  let regions = [];
  if(uiBodyMap.length){
    regions = uiBodyMap.map(r => ({
      region: r.Body_Region,
      label: r.UI_Label || r.Body_Region,
      icon: r.Suggested_Icon || "🩺"
    }));
  } else {
    const uniq = [...new Set(symptoms.map(s => s.Body_Region).filter(Boolean))];
    regions = uniq.map(r => ({ region: r, label: r, icon: "🩺" }));
  }

  regions.forEach(r => {
    const btn = document.createElement("button");
    btn.className = "body-btn";
    btn.dataset.region = r.region;
    btn.innerHTML = `${r.icon} ${r.label}`;
    btn.onclick = () => selectRegion(r.region, btn);
    box.appendChild(btn);
  });
}

// ---------- Select Region ----------
function selectRegion(region, btn = null){
  currentRegion = region;

  setText(
    "currentFilterText",
    region === "ALL" ? "Showing: All symptoms" : `Showing: ${region} symptoms`
  );

  document.querySelectorAll(".body-btn").forEach(b => b.classList.remove("active"));

  if(btn){
    btn.classList.add("active");
  } else {
    const mapped = document.querySelector(`.body-btn[data-region="${region}"]`);
    if(mapped) mapped.classList.add("active");
  }

  const list = getEl("symptomList");
  if(!list) return;

  list.innerHTML = "";

  const filtered = region === "ALL"
    ? symptoms
    : symptoms.filter(s => s.Body_Region === region);

  filtered.forEach(s => {
    const checked = selected.includes(s.Symptom_ID) ? "checked" : "";
    list.innerHTML += `
      <label class="symptom-chip">
        <input type="checkbox" value="${s.Symptom_ID}" ${checked} onchange="updateSelection()">
        ${s.Icon || ""} ${s.Symptom_Name}
      </label>
    `;
  });
}

// ---------- Symptoms ----------
function updateSelection(){
  selected = [...document.querySelectorAll("#symptomList input:checked")].map(x => x.value);
  updateSuggestions();
}

function updateSuggestions(){
  const box = getEl("suggestionsBox");
  if(!box) return;

  if(selected.length === 0){
    box.textContent = "No suggestions yet. Select symptoms first.";
    return;
  }

  const relatedDiseaseIDs = [
    ...new Set(
      diseaseSymptoms
        .filter(x => selected.includes(x.Symptom_ID))
        .map(x => x.Disease_ID)
    )
  ];

  const possibleSymptomIDs = [
    ...new Set(
      diseaseSymptoms
        .filter(x => relatedDiseaseIDs.includes(x.Disease_ID) && !selected.includes(x.Symptom_ID))
        .map(x => x.Symptom_ID)
    )
  ].slice(0, 6);

  const names = possibleSymptomIDs.map(id => {
    const s = symptoms.find(x => x.Symptom_ID === id);
    return s ? `${s.Icon || ""} ${s.Symptom_Name}` : id;
  });

  box.innerHTML = names.length
    ? names.map(x => `• ${x}`).join("<br>")
    : "No additional suggestions found.";
}

// ---------- Diagnosis ----------
function runDiagnosis(){
  if(!diseases.length){
    alert("Load the database first.");
    return;
  }

  if(!selected.length){
    alert("Select symptoms first.");
    return;
  }

  const scores = {};
  diseases.forEach(d => scores[d.Disease_ID] = 0);

  diseaseSymptoms.forEach(link => {
    if(selected.includes(link.Symptom_ID)){
      scores[link.Disease_ID] += Number(link.Weight || 0);
    }
  });

  const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
  top3Diseases = sorted.slice(0,3).map(item => ({
    diseaseId: item[0],
    score: Number(item[1])
  }));

  topDisease = top3Diseases[0]?.diseaseId || "";
  finalDisease = diseases.find(d => d.Disease_ID === topDisease) || null;
  finalEvaluation = null;

  showMatchingPage();
  buildLabInputs();
  setHTML("studentResult", "No answer checked yet.");
  showPage("matching");
}

function showMatchingPage(){
  const box = getEl("results");
  if(!box) return;

  box.innerHTML = "";

  if(!top3Diseases.length) return;

  const maxScore = top3Diseases[0].score || 1;

  top3Diseases.forEach(item => {
    const d = diseases.find(x => x.Disease_ID === item.diseaseId);
    const percent = Math.round((item.score / maxScore) * 100);

    const diseaseLinks = diseaseSymptoms.filter(x => x.Disease_ID === item.diseaseId);
    const tags = diseaseLinks.slice(0,10).map(link => {
      const s = symptoms.find(x => x.Symptom_ID === link.Symptom_ID);
      const matched = selected.includes(link.Symptom_ID);
      return `
        <span class="symptom-tag ${matched ? 'match' : 'nomatch'}">
          ${matched ? "✔" : "✖"} ${s ? s.Symptom_Name : link.Symptom_ID}
        </span>
      `;
    }).join("");

    box.innerHTML += `
      <div class="matching-card">
        <div class="matching-head">
          <div>
            <h3 style="margin:0;">${d ? d.Disease_Name : item.diseaseId}</h3>
            <div class="small-note">${d ? (d.Category || "") : ""}</div>
          </div>
          <div class="matching-percent">${percent}/100</div>
        </div>

        <div class="scoreBar">
          <div class="scoreFill" style="width:${percent}%"></div>
        </div>

        <div class="symptom-tags">${tags}</div>
      </div>
    `;
  });
}

// ---------- Student Mode ----------
function checkStudentAnswer(){
  const guess = (getEl("studentGuess")?.value || "").trim().toLowerCase();

  if(!topDisease){
    alert("Run diagnosis first.");
    return;
  }

  const correct = diseases.find(x => x.Disease_ID === topDisease);
  if(!correct) return;

  const correctName = (correct.Disease_Name || "").toLowerCase();

  if(guess && (guess.includes(correctName) || correctName.includes(guess))){
    setHTML("studentResult", "✅ Correct diagnosis!");
  } else {
    setHTML("studentResult", `❌ Not correct. System suggests: ${correct.Disease_Name}`);
  }
}

// ---------- Labs ----------
function buildLabInputs(){
  const box = getEl("labInputs");
  if(!box) return;

  box.innerHTML = "";

  if(!top3Diseases.length){
    box.innerHTML = "No candidate diseases yet.";
    return;
  }

  const allTests = new Map();

  top3Diseases.forEach(item => {
    diseaseTests
      .filter(x => x.Disease_ID === item.diseaseId)
      .forEach(t => {
        const testDef = tests.find(tt => tt.Test_ID === t.Test_ID);
        const label = testDef ? testDef.Test_Name : (t.Test_ID || "Unnamed Test");

        if(!allTests.has(t.Test_ID)){
          allTests.set(t.Test_ID, {
            label,
            options: new Set()
          });
        }

        if(t.Expected_Result){
          allTests.get(t.Test_ID).options.add(String(t.Expected_Result).trim());
        }
      });
  });

  const genericOptions = ["Positive", "Negative", "Normal", "Abnormal", "Low", "High", "Growth", "No growth"];

  allTests.forEach((data, testId) => {
    genericOptions.forEach(opt => data.options.add(opt));

    const optionsHtml = [...data.options].map(opt => {
      return `<option value="${opt}">${opt}</option>`;
    }).join("");

    box.innerHTML += `
      <div class="lab-test-row">
        <div class="lab-test-title">🧪 ${data.label}</div>
        <select class="lab-result-input" data-testid="${testId}">
          <option value="">Select result</option>
          ${optionsHtml}
        </select>
      </div>
    `;
  });

  if(!allTests.size){
    box.innerHTML = `<div class="panel">No lab tests linked to the top 3 diseases.</div>`;
  }
}

function evaluateLabDiagnosis(){
  if(!top3Diseases.length){
    alert("Run diagnosis first.");
    return;
  }

  const entered = {};
  document.querySelectorAll(".lab-result-input").forEach(inp => {
    entered[inp.dataset.testid] = (inp.value || "").trim().toLowerCase();
  });

  const ranked = top3Diseases.map(item => {
    const relatedTests = diseaseTests.filter(x => x.Disease_ID === item.diseaseId);
    let labScore = 0;

    relatedTests.forEach(t => {
      const expected = String(t.Expected_Result || "").trim().toLowerCase();
      const got = entered[t.Test_ID] || "";

      if(got && expected){
        if(got === expected){
          labScore += 4;
        } else if(got.includes(expected) || expected.includes(got)){
          labScore += 3;
        }
      }
    });

    return {
      diseaseId: item.diseaseId,
      symptomScore: item.score,
      labScore,
      finalScore: item.score + labScore
    };
  }).sort((a,b) => b.finalScore - a.finalScore);

  const winner = ranked[0];
  finalDisease = diseases.find(d => d.Disease_ID === winner.diseaseId) || null;
  topDisease = winner.diseaseId;
  finalEvaluation = winner;

  const diseaseName = finalDisease ? finalDisease.Disease_Name : winner.diseaseId;

  // يبقى الجزء القديم إذا تحتاجينه
  setHTML("labDecisionBox", `
    <div class="report-title">Lab-based Decision</div>
    <div class="report-highlight">
      Most supported diagnosis after lab comparison: <strong>${diseaseName}</strong><br>
      Symptom score: ${winner.symptomScore}<br>
      Lab score: ${winner.labScore}<br>
      Final combined score: ${winner.finalScore}
    </div>
  `);

  // هذا الجزء يعبّي الصفحة الجديدة
  setHTML("labResultContent", `
  <div style="text-align:center;">

    <div style="font-size:22px; font-weight:bold; margin-bottom:10px;">
      🧪 Final Lab-Based Diagnosis
    </div>

    <div style="
      font-size:20px;
      color:#2c3e50;
      background:#f4f6f8;
      padding:15px;
      border-radius:10px;
      margin-bottom:15px;
    ">
      🧬 <strong>${diseaseName}</strong>
    </div>

    <div style="margin-bottom:10px;">
      🧠 Symptom Score: <strong>${winner.symptomScore}</strong>
    </div>

    <div style="margin-bottom:10px;">
      🧪 Lab Score: <strong>${winner.labScore}</strong>
    </div>

    <div style="margin-bottom:15px;">
      📊 Final Score: <strong>${winner.finalScore}</strong>
    </div>

    <div style="
      color:green;
      font-weight:bold;
      font-size:16px;
      margin-top:10px;
    ">
      ✔ Diagnosis confirmed based on combined analysis
    </div>

  </div>
`);



  // نجهز محتوى صفحة الـ Risk قبل الانتقال إلها
  renderRiskAndCareContent();

  // انتقال إلى صفحة النتيجة الجديدة
  showPage("labResult");
}

// ---------- Risk / Care ----------
function renderRiskAndCareContent(){
  const d = finalDisease;
  if(!d) return;

  let width = 30;
  let cls = "low";

  if(d.Contagious_Level === "Medium"){
    width = 60;
    cls = "medium";
  }
  if(d.Contagious_Level === "High"){
    width = 90;
    cls = "high";
  }

  const bar = getEl("contagiousBar");
  if(bar){
    bar.className = `meter-fill ${cls}`;
    bar.style.width = width + "%";
  }

  setText("contagiousText", `${d.Contagious_Level || "Unknown"} (${width}%)`);
  setText("transmissionText", d.Transmission_Method || "—");

  let visual = "🩺";
  if(d.Transmission_Method === "Airborne") visual = "🦠 ➜ 😷 ➜ 🧍";
  else if(d.Transmission_Method === "Contact") visual = "🖐 ➜ 🖐";
  else if(d.Transmission_Method === "Blood") visual = "🩸 ➜ 💉 ➜ 🧍";
  else if(d.Transmission_Method === "Genetic") visual = "🧬 ➜ 👶";
  else if(d.Transmission_Method === "Environmental") visual = "🌫 ➜ 🧍";

  setText("transmissionVisual", visual);
  setText("spreadMap", visual);

  const p = precautions.find(x => x.Contagious_Level === d.Contagious_Level);
  let careText = p ? p.Suggested_Precaution : "Follow standard precautions.";
  careText += `<br>Can it be treated? ${d.Treatable || "—"}`;
  careText += `<br>Treatment / Management: ${d.Treatment || "—"}`;

  setHTML("precautionText", careText);

  const immune = immuneLogic.find(x => x.Immunity_Marker === d.Immunity_Marker);
  setHTML("immuneCard", `
    <div class="immune-icon">🛡</div>
    <div class="immune-text">
      <strong>Marker:</strong> ${d.Immunity_Marker || "None"}<br>
      ${immune ? (immune.Interpretation || "") : ""}
    </div>
  `);

  const diff = differential.filter(x => x.Disease_ID === d.Disease_ID);
  setHTML(
    "diffBox",
    diff.length
      ? diff.map(x => `• ${x.Possible_Alternative_Disease}`).join("<br>")
      : "No differential diagnosis listed."
  );

  showConfidence();
  showDiseaseCard();
  buildTimeline();
}

function showRiskAndCare(){
  renderRiskAndCareContent();
  showPage("risk");
}

// ---------- Confidence ----------
function showConfidence(){
  let percent = 80;

  if(finalEvaluation){
    percent = Math.min(95, Math.max(55, Math.round((finalEvaluation.finalScore || 0) * 10)));
  }

  const fill = getEl("confidenceFill");
  if(fill) fill.style.width = percent + "%";

  setText("confidenceText", `${percent}% Confidence`);
}

// ---------- Disease Card ----------
function showDiseaseCard(){
  const d = finalDisease;
  if(!d) return;

  setHTML("diseaseCard", `
    <h3 style="margin-top:0;">${d.Disease_Name}</h3>
    <p><strong>Category:</strong> ${d.Category || "—"}</p>
    <p><strong>Transmission:</strong> ${d.Transmission_Method || "—"}</p>
    <p><strong>Treatable:</strong> ${d.Treatable || "—"}</p>
    <p><strong>Treatment:</strong> ${d.Treatment || "—"}</p>
  `);
}

// ---------- Timeline ----------
function buildTimeline(){
  const d = finalDisease;
  if(!d) return;

  let stages = [];
  const name = (d.Disease_Name || "").toLowerCase();
  const category = (d.Category || "").toLowerCase();

  if(name.includes("covid")){
    stages = [
      {day:"Day 1-2", desc:"Mild fever and fatigue"},
      {day:"Day 3-5", desc:"Cough and loss of smell"},
      {day:"Day 5-7", desc:"Shortness of breath may appear"},
      {day:"Advanced", desc:"Respiratory distress in severe cases"}
    ];
  } else if(name.includes("influenza")){
    stages = [
      {day:"Day 1", desc:"Sudden fever and body aches"},
      {day:"Day 2-3", desc:"Cough and fatigue increase"},
      {day:"Day 4-5", desc:"Respiratory symptoms continue"},
      {day:"Recovery", desc:"Symptoms gradually improve"}
    ];
  } else if(category.includes("fungal")){
    stages = [
      {day:"Early", desc:"Localized irritation or mild symptoms"},
      {day:"Progression", desc:"Symptoms expand or worsen"},
      {day:"Established", desc:"Clinical signs become clearer"},
      {day:"Complicated", desc:"Complications may occur if untreated"}
    ];
  } else {
    stages = [
      {day:"Stage 1", desc:"Initial symptoms appear"},
      {day:"Stage 2", desc:"Symptoms become more noticeable"},
      {day:"Stage 3", desc:"Clinical complications may develop"},
      {day:"Stage 4", desc:"Management and monitoring are needed"}
    ];
  }

  const box = getEl("progressTimeline");
  if(!box) return;

  box.innerHTML = "";

  stages.forEach((s,i) => {
    box.innerHTML += `
      <div class="timeline-step" id="timelineStep${i}">
        <div class="timeline-day">${s.day}</div>
        <div class="timeline-desc">${s.desc}</div>
      </div>
    `;
  });
}

function playProgression(){
  const steps = document.querySelectorAll(".timeline-step");
  steps.forEach((step,i) => {
    setTimeout(() => {
      step.classList.add("active");
    }, i * 700);
  });
}

// ---------- Final Report ----------
function generateReport(){
  if(!finalDisease){
    alert("Evaluate lab diagnosis first.");
    return;
  }

  const labResults = [...document.querySelectorAll(".lab-result-input")]
    .map(x => {
      const row = x.closest(".lab-test-row");
      const label = row ? row.querySelector(".lab-test-title").innerText.replace("🧪 ", "") : x.dataset.testid;
      return `<li>${label}: ${x.value || "—"}</li>`;
    })
    .join("");

  const selectedNames = selected.map(id => {
    const s = symptoms.find(x => x.Symptom_ID === id);
    return s ? s.Symptom_Name : id;
  });

  setHTML("finalReport", `
    <div class="report-section">
      <div class="report-title">Patient Information</div>
      Name: ${getEl("name")?.value || "—"}<br>
      Age: ${getEl("age")?.value || "—"}<br>
      Gender: ${getEl("gender")?.value || "—"}<br>
      Case ID: ${getEl("caseID")?.value || "—"}
    </div>

    <div class="report-section">
      <div class="report-title">Selected Symptoms</div>
      ${selectedNames.length ? selectedNames.join(", ") : "—"}
    </div>

    <div class="report-section">
      <div class="report-title">Confirmed / Most Supported Disease</div>
      <div class="report-highlight">
        ${finalDisease.Disease_Name}<br>
        Category: ${finalDisease.Category || "—"}<br>
        Treatable: ${finalDisease.Treatable || "—"}<br>
        Treatment: ${finalDisease.Treatment || "—"}
      </div>
    </div>

    <div class="report-section">
      <div class="report-title">Risk & Care</div>
      Contagiousness: ${finalDisease.Contagious_Level || "—"}<br>
      Transmission: ${finalDisease.Transmission_Method || "—"}<br>
      Immune Marker: ${finalDisease.Immunity_Marker || "—"}
    </div>

    <div class="report-section">
      <div class="report-title">Lab Results</div>
      <ul class="report-list">${labResults || "<li>No results entered</li>"}</ul>
    </div>

    <div class="report-section">
      <div class="report-title">Diagnostic Confidence</div>
      ${getEl("confidenceText")?.innerText || "—"}
    </div>
  `);

  showPage("report");
}

// ---------- Reset ----------
function resetSelections(){
  selected = [];
  topDisease = "";
  top3Diseases = [];
  finalDisease = null;
  finalEvaluation = null;
  currentRegion = null;

  setText("suggestionsBox", "No suggestions yet. Select symptoms first.");
  setHTML("results", "");
  setHTML("labInputs", "");
  setHTML("labDecisionBox", "No lab-based decision yet.");
  setHTML("labResultContent", "No result yet.");
  setHTML("spreadMap", "No spread map yet.");
  setHTML("diseaseCard", "No disease card yet.");
  setHTML("progressTimeline", "");
  setHTML("diffBox", "No differential diagnosis yet.");
  setHTML("immuneCard", `
    <div class="immune-icon">🛡</div>
    <div class="immune-text">No immune marker available yet.</div>
  `);
  setHTML("finalReport", "No report generated yet.");

  const fill = getEl("confidenceFill");
  if(fill) fill.style.width = "0%";
  setText("confidenceText", "No confidence score yet.");
  setText("contagiousText", "No result yet");
  setText("transmissionText", "—");
  setHTML("precautionText", "—");
  setText("transmissionVisual", "🩺");
  setText("currentFilterText", "Showing: No symptoms yet");

  const list = getEl("symptomList");
  if(list){
    list.innerHTML = `
      <div style="text-align:center; padding:20px; color:#888;">
        Select a category first 👆
      </div>
    `;
  }

  document.querySelectorAll(".body-btn").forEach(b => b.classList.remove("active"));
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  bindPatientInputs();
  showPage("patient");
  loadDatabaseAuto();
});
