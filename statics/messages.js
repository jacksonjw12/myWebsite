
const messageState = {
	visible: false,
	currentMessage: "",


}

const messageContainer = document.getElementById('message');
const messageBox = document.getElementById('messageBox');


function closeMessage() {
	console.log('closeMessage')
	messageState.timeout = undefined;
	if(!messageState.visible) {
		return;
	}

	messageState.visible = false;
	messageContainer.style.display = "none";


}

function createMessage(message, useTimeout=true, timeoutMS=2500) {
	if(messageState.timeout){
		window.clearTimeout(messageState.timeout);
		messageState.timeout = undefined;
	}

	messageState.currentMessage = message;
	messageBox.innerHTML = messageState.currentMessage;

	if(!messageState.visible){
		messageContainer.style.display = "flex";
		messageState.visible = true;
	}

	if(useTimeout && timeoutMS) {
		messageState.timeout = window.setTimeout(()=>{closeMessage()}, timeoutMS);
	}
	

}


messageBox.addEventListener('click', closeMessage)