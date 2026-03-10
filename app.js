
const app = document.getElementById("app")

function loadStudents(){
return JSON.parse(localStorage.getItem("wm_students")||"[]")
}

function saveStudents(data){
localStorage.setItem("wm_students",JSON.stringify(data))
}

function renderDashboard(){

const students = loadStudents()

app.innerHTML=`
<div class="card">
<div class="card-title">學生數量</div>
${students.length} 位學生
</div>

<div class="card">
<div class="card-title">快速新增學生</div>
<input id="name" class="input" placeholder="學生名字">
<button class="button" onclick="addStudent()">新增</button>
</div>
`
}

function renderStudents(){

const students = loadStudents()

let list = students.map((s,i)=>`
<div class="card">
<div class="card-title">${s.name}</div>
評分: ${s.rating || 0}
<br><br>
<button class="button" onclick="rateStudent(${i})">評分 +1</button>
</div>
`).join("")

app.innerHTML=`
<div class="card">
<div class="card-title">學生列表</div>
</div>
${list}
`
}

function renderSchedule(){

app.innerHTML=`
<div class="card">
<div class="card-title">時間表</div>
目前版本示範 UI，之後可以加入課程安排。
</div>
`
}

function renderIncome(){

app.innerHTML=`
<div class="card">
<div class="card-title">收入統計</div>
之後可以加入課堂收費與統計。
</div>
`
}

function renderSettings(){

app.innerHTML=`
<div class="card">
<div class="card-title">設定</div>
Walking Melody 2.0 Prototype
</div>
`
}

function addStudent(){

const name = document.getElementById("name").value

if(!name)return

const students = loadStudents()

students.push({
name:name,
rating:0
})

saveStudents(students)

renderDashboard()
}

function rateStudent(i){

const students = loadStudents()

students[i].rating +=1

saveStudents(students)

renderStudents()
}

function navigate(page){

document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"))

document.querySelector(`[data-page="${page}"]`).classList.add("active")

if(page==="dashboard")renderDashboard()
if(page==="students")renderStudents()
if(page==="schedule")renderSchedule()
if(page==="income")renderIncome()
if(page==="settings")renderSettings()

lucide.createIcons()
}

document.querySelectorAll(".nav-item").forEach(n=>{
n.onclick=()=>navigate(n.dataset.page)
})

navigate("dashboard")
