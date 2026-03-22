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
let currentRegion = null; // ❗ مهم: بالبداية null

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
    risk: "riskPage",
    report: "reportPage"
  };

  const target = getEl(pageMap[page]);
  if(target){
    target.classList.add("active");
  }
}

// ---------- Patient ----------
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

// ---------- Database ----------
async function loadDatabaseAuto(){
  const status = getEl("dbStatus");

  try{
    const response = await fetch("database.xlsx");
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

    status.textContent = "Database loaded ✔️";

    buildBodyMap();
    resetSelections();
    // 🔥 إجبار إخفاء الأعراض بالبداية
setTimeout(() => {
  const list = getEl("symptomList");
  if(list){
    list.innerHTML = `
      <div style="text-align:center; padding:20px; color:#888;">
        Select a category first 👆
      </div>
    `;
  }

  currentRegion = null;
}, 100);

  }catch(err){
    console.error(err);
    status.textContent = "Database failed ❌";
  }
}

// ---------- Body Map ----------
function buildBodyMap(){
  const box = getEl("bodyMapButtons");
  if(!box) return;

  box.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "body-btn";
  allBtn.innerHTML = "✨ All";
  allBtn.onclick = () => selectRegion("ALL", allBtn);
  box.appendChild(allBtn);

  let regions = [...new Set(symptoms.map(s => s.Body_Region).filter(Boolean))];

  regions.forEach(r => {
    const btn = document.createElement("button");
    btn.className = "body-btn";
    btn.innerHTML = r;
    btn.onclick = () => selectRegion(r, btn);
    box.appendChild(btn);
  });
}

// ❗ عرض الأعراض فقط عند الاختيار
function selectRegion(region, btn){
  currentRegion = region;

  document.querySelectorAll(".body-btn").forEach(b => b.classList.remove("active"));
  if(btn) btn.classList.add("active");

  const list = getEl("symptomList");
  if(!list) return;

  list.innerHTML = "";

  const filtered = region === "ALL"
    ? symptoms
    : symptoms.filter(s => s.Body_Region === region);

  filtered.forEach(s => {
    list.innerHTML += `
      <label class="symptom-chip">
        <input type="checkbox" value="${s.Symptom_ID}" onchange="updateSelection()">
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
    box.textContent = "No suggestions yet.";
    return;
  }

  box.innerHTML = "Suggestions updated ✔️";
}

// ---------- Reset ----------
function resetSelections(){
  selected = [];

  setHTML("symptomList", `
    <div style="text-align:center; padding:20px; color:#888;">
      Select a category first 👆
    </div>
  `);

  setText("suggestionsBox", "No suggestions yet.");
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  bindPatientInputs();
  showPage("patient");
  loadDatabaseAuto();
});