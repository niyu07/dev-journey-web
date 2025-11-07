// ==UserScript==
// @name         Unipaa Assignments Scraper
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Scrape assignments from Unipaa and send them to the dev-journey-web app.
// @author       You
// @match        https://ichipol.g.hiroshima-cu.ac.jp/uprx/up/pk/pky001/Pky00102.xhtml
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // Function to find a link by its text content
    function findLinkByText(text) {
        return Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === text);
    }

    // Function to scrape assignments and send to backend
    function scrapeAndSend() {
        const assignments = [];
        const seenAssignments = new Set();
        const allRows = document.querySelectorAll('.ui-datalist-item');

        allRows.forEach(row => {
            // Check if the row is an actual assignment using the class provided by the user
            const isAssignment = row.querySelector('.signPortalKadai');

            if (isAssignment) {
                // This is an assignment, so process it
                const taskElement = row.querySelector('a.textTitle');
                const task = taskElement ? taskElement.innerText.trim() : null;

                const subjectElement = row.querySelector('span.textFrom');
                const subject = subjectElement ? subjectElement.innerText.trim() : 'Unknown Subject';

                // Per user request, ignore items where the subject is '／'
                if (subject === '／') {
                    return; // Skip this row
                }

                // The user specified that the deadline is the second element with class 'textDate'
                const dateElements = row.querySelectorAll('.textDate');
                const deadline = dateElements.length > 1 ? dateElements[1].innerText.trim() : 'No deadline';

                if (task) {
                    const assignment = { subject, task, deadline };
                    // Deduplicate based on task and deadline, as subject is unreliable for now.
                    const assignmentKey = `${task}|${deadline}`;
                    if (!seenAssignments.has(assignmentKey)) {
                        assignments.push(assignment);
                        seenAssignments.add(assignmentKey);
                    }
                }
            }
        });

        console.log(`Found ${allRows.length} total rows, extracted ${assignments.length} assignments.`);

        // ALWAYS send the data to the backend. 
        // The backend will replace its store with the new list.
        // This is how assignments are removed from the app after being submitted.
        GM_xmlhttpRequest({
            method: "POST",
            url: "http://localhost:8000/api/unipaa-assignments",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ assignments: assignments }),
            onload: function(response) {
                console.log("Data sent to backend:", response.responseText);
                const message = assignments.length > 0
                    ? `Successfully sent ${assignments.length} assignments to your app.`
                    : 'No assignments found on page. Your app has been updated.';
                GM_notification({
                    title: 'Unipaa Scraper',
                    text: message,
                    timeout: 4000
                });
            },
            onerror: function(response) {
                console.error("Error sending data to backend:", response.statusText);
                GM_notification({
                    title: 'Unipaa Scraper Error',
                    text: 'Failed to send assignments to the backend. Is the server running?',
                    timeout: 6000
                });
            }
        });
    }

    // --- Main execution ---

    const deadlineTab = findLinkByText('期限あり');
    if (deadlineTab) {
        console.log('Found "期限あり" link. Clicking it.');
        deadlineTab.click();

        // Wait 5 seconds for the content to load after the click, then scrape.
        console.log('Waiting 5 seconds for assignment page to load...');
        setTimeout(scrapeAndSend, 5000);

    } else {
        console.log('"期限あり" link not found.');
        GM_notification({
            title: 'Unipaa Scraper',
            text: 'Could not find the "期限あり" link on the page.',
            timeout: 6000
        });
    }

})();
