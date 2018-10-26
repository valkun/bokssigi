function onarrowbuttonclick(ev){
    console.log(ev);
    var accountElement = ev.target.parentElement.parentElement;
    // var description = accountElement.getAttribute('desc');
    // var id = accountElement.getAttribute('id')
    // var type = accountElement.getAttribute('type')
    var seq = accountElement.getAttribute('accountSeq') 
    let seqNumber = Number(seq);
    let lastNumber = accountElement.parentElement.childElementCount - 1;
    var direction = 1;   
    var opsiteItem = null; 
    if(ev.target.innerText == 'arrow_drop_up'){
        direction = -1;
        opsiteItem = accountElement.previousSibling;
    }else{
        direction = 1;
        opsiteItem = accountElement.nextSibling;
    }    
    //opsiteItem = accountElement.parentElement.children[Number(seq)+direction];
    accountElement.setAttribute('accountSeq', direction + seqNumber);
    opsiteItem.setAttribute('accountSeq', seq);
    
    let target = [accountElement, opsiteItem];
    target.forEach((elem)=>{
        var description = elem.getAttribute('desc');
        var id = elem.getAttribute('id')
        var type = elem.getAttribute('type')
        var seq = elem.getAttribute('accountSeq') 
        data = `description=${description}&seq=${seq}&type=${type}`;
        //
        axios.post(`/accounts/${id}/edit`, data, {
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then((response) => {
            if(direction == 1){
                //down
                accountElement.parentElement.insertBefore(opsiteItem, accountElement);
                // first elem
                if(seqNumber == 1){
                    accountElement.children[1].children[0].style.visibility = 'visible';
                    accountElement.children[1].children[1].style.visibility = 'visible';
                    opsiteItem.children[1].children[0].style.visibility = 'hidden';
                }
            }
            else{
                //up
                accountElement.parentElement.insertBefore(accountElement, opsiteItem);
                // last elem
                if(seqNumber == lastNumber){
                    accountElement.children[1].children[0].style.visibility = 'visible';
                    accountElement.children[1].children[1].style.visibility = 'visible';
                    opsiteItem.children[1].children[1].style.visibility = 'hidden';
                }
            }
        });  
    });    
}

function removeTopNBottom(){
    var accountBlocks = $('.accountBlocks');
    for (let b = 0, bLen = accountBlocks.length; b < bLen; b++){        
        let accounts = accountBlocks[b].getElementsByClassName('row');        
        for (let i = 0, len = accounts.length; i < len; i++){
            if(i==0){
                accounts[i].children[1].children[0].style.visibility = 'hidden';
                accounts[i].children[1].children[1].style.visibility = 'visible';
            }else if(i ==  len - 1){
                accounts[i].children[1].children[0].style.visibility = 'visible';
                accounts[i].children[1].children[1].style.visibility = 'hidden';
            }else{
                accounts[i].children[1].children[0].style.visibility = 'visible';
                accounts[i].children[1].children[1].style.visibility = 'visible';
            }            
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    removeTopNBottom() 
});