/* === Кастомный alert === */
export function showAlert(message, callback) {
  const alertBox = document.getElementById('alertBox');
  const alertText = document.getElementById('alertText');
  const alertOverlay = document.getElementById('alertOverlay');

  if (!alertBox || !alertText || !alertOverlay) return;

  alertText.innerHTML = message.replace(/\n/g, "<br>");
  alertBox.style.display = 'block';
  alertOverlay.style.display = 'block';

  const okBtn = document.getElementById('alertOkBtn');
  okBtn.focus();

  const closeAlert = () => {
    alertBox.style.display = 'none';
    alertOverlay.style.display = 'none';
    okBtn.removeEventListener('click', closeAlert);
    if (callback) callback();
  };

  okBtn.addEventListener('click', closeAlert);
}

/* === Кастомный confirm === */
export function showConfirm(message, callback) {
  const confirmBox = document.getElementById('confirmBox');
  const confirmText = document.getElementById('confirmText');
  const alertOverlay = document.getElementById('alertOverlay');

  if (!confirmBox || !confirmText || !alertOverlay) return;

  confirmText.textContent = message;
  confirmBox.style.display = 'block';
  alertOverlay.style.display = 'block';

  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  const onOk = () => {
    confirmBox.style.display = 'none';
    alertOverlay.style.display = 'none';
    cleanup();
    callback(true);
  };

  const onCancel = () => {
    confirmBox.style.display = 'none';
    alertOverlay.style.display = 'none';
    cleanup();
    callback(false);
  };

  function cleanup() {
    okBtn.removeEventListener('click', onOk);
    cancelBtn.removeEventListener('click', onCancel);
  }

  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);

  okBtn.focus();
}