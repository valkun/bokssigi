
// disable text selection
document.onselectstart = function() {
    return false;
}

function onmodalsubmit(e){
    console.log("oneditsubmit");
    e.preventDefault(); 
    data = new FormData();
    let usingDate = $('#modalusingDate').val();
    let description = $('#modaldescription').val();
    let amount = $('#modalamount').val().replace(/,/gi, "");
    let lAccount = $('#modallAccount')[0].getAttribute("accountId")
    let rAccount = $('#modalrAccount')[0].getAttribute("accountId")
    //let now = Date.now();
    let currentTr = document.getElementById("modaltrForm").currentTr;
    let insertDate = currentTr.getAttribute('insertDate');
    let trId = currentTr.getAttribute('trId');
    data = `insertDate=${insertDate}&usingDate=${usingDate}&description=${description}&amount=${amount}&lAccount=${lAccount}&rAccount=${rAccount}`;
    //
    axios.post(`/transactions/${trId}/edit`, data, {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    }).then((response) => {
        //console.log(response);
        editTransaction(response.data);
    });  
}

function onsubmit(e){
    console.log("submit")   
    e.preventDefault();
    data = new FormData();
    let usingDate = $('#usingDate').val();
    let description = $('#description').val();
    let amount = $('#amount').val().replace(/,/gi, "");
    let lAccount = $('#lAccount')[0].getAttribute("accountId")
    let rAccount = $('#rAccount')[0].getAttribute("accountId")
    let now = Date.now();
    data = `insertDate=${now}&usingDate=${usingDate}&description=${description}&amount=${amount}&lAccount=${lAccount}&rAccount=${rAccount}`;
    //
    axios.post('/transactions/add', data, {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    }).then((response) => {
        //console.log(response);
        insertTransaction(response.data);
    });    
}

function editTransaction(data){
    let currentTr = document.getElementById("modaltrForm").currentTr;
    let tds = currentTr.getElementsByTagName('td');
    currentTr.setAttribute('trId', data.id)
    currentTr.setAttribute('insertDate', data.insertDate)
    tds[0].innerText=data.usingDate;
    tds[1].innerText=data.description;
    tds[2].innerText=numberWithCommas(data.amount);
    tds[3].innerText=data.lAccountDescription;
    tds[3].setAttribute('accountId', data.lAccount)
    tds[4].innerText=data.rAccountDescription;
    tds[4].setAttribute('accountId', data.rAccount)
}

function insertTransaction(data) {
    let table = $("#transactionTable")[0].tBodies[0];        
    let insertedTransaction = 
    `<tr onmousedown='rowClick(this,false);', trId=${data.id}>
        <td scope="row">${data.usingDate}</td>    
        <td>${data.description}</td>
        <td>${data.amount}</td>
        <td accountId=${data.lAccount}>${data.lAccountDescription}</td>
        <td accountId=${data.rAccount}>${data.rAccountDescription}</td>
        <td>
            <a href='#modal1' class='modal-trigger'>
                <i class="tiny material-icons"  trId=${data.id}  onclick="editClick(this);"> edit </i>
            </a>
            <a href='/transactions/${data.id}/delete'>
                <i class="tiny material-icons"  trId=${data.id}> delete </i>
            </a>
        </td>
    </tr>
    `
    let innerHTML = table.innerHTML;
    table.innerHTML = insertedTransaction + innerHTML;
}

function modalaccoutClicked(button) {
    let accountId = button.getAttribute("accountId");
    console.log("account clicked " + button.getAttribute("accountId"));
    //
    axios.get(`/api/accounts/${accountId}`, {
        headers: {'Content-Type': 'application/json'}
    }).then((response) => {
        if(button.getAttribute('name') == 'accountL'){
            $('#modallAccount')[0].value = response.data.description;
            $('#modallAccount')[0].setAttribute('accountId', response.data.id);
        }
        else{
            $('#modalrAccount')[0].value = response.data.description;
            $('#modalrAccount')[0].setAttribute('accountId', response.data.id);
        }        
    });     
}

function accoutClicked(button) {
    let accountId = button.getAttribute("accountId");
    console.log("account clicked " + button.getAttribute("accountId"));
    //
    axios.get(`/api/accounts/${accountId}`, {
        headers: {'Content-Type': 'application/json'}
    }).then((response) => {
        if(button.getAttribute('name') == 'accountL'){
            $('#lAccount')[0].value = response.data.description;
            $('#lAccount')[0].setAttribute('accountId', response.data.id);
        }
        else{
            $('#rAccount')[0].value = response.data.description;
            $('#rAccount')[0].setAttribute('accountId', response.data.id);
        }        
    });     
}

function editClick(currentItem) {
    console.log("edit " + currentItem.getAttribute('trId'));
    currentTr = currentItem.parentElement.parentElement.parentElement;
    //
    document.getElementById("transactionIdOfModal").innerText = currentItem.getAttribute('trId');    
    //    
    document.getElementById("modaltrForm").currentTr = currentTr;
    let tds = currentTr.getElementsByTagName('td')
    $('#modalusingDate')[0].value = tds[0].innerText;
    $('#modaldescription')[0].value = tds[1].innerText;
    $('#modalamount')[0].value = tds[2].innerText;
    $('#modallAccount')[0].value = tds[3].innerText;
    $('#modallAccount')[0].setAttribute('accountId', tds[3].getAttribute('accountId'));
    $('#modalrAccount')[0].value = tds[4].innerText;
    $('#modalrAccount')[0].setAttribute('accountId', tds[4].getAttribute('accountId'));
}

function rowClick(currenttr, lock) {  
    console.log("click " + currenttr.getAttribute('trId'));
}

function requireMore(nextPageToken) {
    $.ajax(`?pageToken=${encodeURIComponent(nextPageToken)}&resType=html`)
        .done((data)=> {
            let table = $('#transactionTable')[0];
            res = JSON.parse(data);
            moreTable = res.html;
            table.innerHTML += moreTable;
            
            var btn = $('#moreButton')[0];
            if(res.nextPageToken) {                                
                btn.setAttribute("onclick" ,"requireMore('"+ res.nextPageToken + "')");
                btn.style.visibility = "visiable"
            }
            else{
                //disable more button
                btn.style.visibility = "hidden"
            }
        })
        .fail((err) => {});       
}

document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems, null);
  
    var form = document.getElementById("trForm").addEventListener( "submit", onsubmit, false);    
    var form = document.getElementById("modaltrForm").addEventListener( "submit", onmodalsubmit, false);    
});

function numberWithCommas(number) {
    var parts = number.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

$(document).ready(function() {    
  $("#transactionTable td.amount").each(function() {
    var num = $(this).text();
    var commaNum = numberWithCommas(num);
    $(this).text(commaNum);
  });
});