/**
 * Django Messages SweetAlert Handler
 * Converts Django messages to SweetAlert notifications
 */

document.addEventListener('DOMContentLoaded', function () {
    // Process Django messages with SweetAlert
    handleDjangoMessages();
});

/**
 * Handle Django messages and display them using SweetAlert
 */
function handleDjangoMessages() {
    // Look for Django messages in the page
    const djangoMessages = document.querySelectorAll('#django-messages .django-message');

    if (djangoMessages.length > 0) {
        // Process each message
        djangoMessages.forEach(messageElement => {
            const messageText = messageElement.textContent.trim();
            const messageType = messageElement.dataset.messageType || 'info';

            // Map Django message types to SweetAlert icons
            let icon = 'info';
            if (messageType === 'success') icon = 'success';
            else if (messageType === 'error') icon = 'error';
            else if (messageType === 'warning') icon = 'warning';

            // Extract activity type and teacher name for reminder messages
            if (messageText.includes('Reminder sent to')) {
                // Parse the message to extract teacher name and activity type
                const teacherNameMatch = messageText.match(/Reminder sent to ([^(]+) about/);
                const activityTypeMatch = messageText.match(/about ([^(]+) for/);

                const teacherName = teacherNameMatch ? teacherNameMatch[1].trim() : '';
                const activityType = activityTypeMatch ? activityTypeMatch[1].trim() : '';

                Swal.fire({
                    title: 'Reminder Sent Successfully',
                    html: `<p><strong>Teacher:</strong> ${teacherName}</p>
                           <p><strong>Activity:</strong> ${activityType}</p>`,
                    icon: 'success',
                    confirmButtonColor: '#3085d6'
                });
            } else {
                // For other types of messages
                Swal.fire({
                    title: messageType.charAt(0).toUpperCase() + messageType.slice(1),
                    text: messageText,
                    icon: icon,
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }
} 