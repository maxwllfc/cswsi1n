var mwcoins = 0;
var tasktype = 1;

function task_complete() {
    switch (tasktype) {
        case 1: mwcoins += 100; break;
        case 2: mwcoins += 150; break;
        case 3: mwcoins += 200; break;
        default: window.prompt("Tipo da tarefa não encontrado.");
    }
}

let tasks = [];

function add_task(type, name) { // Adiciona uma nova tarefa
    const NewTask = {
        id: tasks.length + 1,
        type: type,
        name: name,
    };
    tasks.push(NewTask); // Puxa a nova tarefa

    console.log("Tarefa adicionada:", NewTask);
    console.log("Lista de tarefas atualizada:", tasks);

    const taskList = document.getElementById("TaskList");
    const listItem = document.createElement("li");
    listItem.textContent = `#${NewTask.id} - [Tipo ${NewTask.type}] ${NewTask.name}`;
    taskList.appendChild(listItem);
}



const AddButton = document.getElementById("AddButton"); // Puxa o id no botão no HTML

AddButton.addEventListener("click", function() { // Puxa o id no botão para acionar essa função no script pelo site
    const type = parseInt(document.getElementById("TypeTask").value);
    const name = document.getElementById("TaskName").value;

    add_task(type, name);
    document.getElementById("TypeTask").value = "";
    document.getElementById("TaskName").value = "";
    window.alert(`Tarefa "${name}" adicionada com sucesso!`);
});