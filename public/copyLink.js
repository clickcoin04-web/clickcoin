// 🔥 Copy invite link to clipboard
document.getElementById('copy-button').addEventListener('click', function() {
  const link = window.location.origin + "/public/register.html?ref=" + inviteCode;
  
  inviteLinkInput.select();  // Select the text in the input box
  document.execCommand("copy");  // Copy the text to the clipboard

  alert("Invite link copied to clipboard!");
});