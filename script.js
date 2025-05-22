// Add this line at the VERY TOP to confirm the script is running
console.log("START of script.js execution");

document.addEventListener('DOMContentLoaded', function () {
    console.log("START of script.js execution"); // Keep this for now

    // ==== INTRO SCREEN LOGIC ====
    const introScreen = document.getElementById('introScreen');
    const mainFormContainer = document.getElementById('mainFormContainer');
    const introDuration = 2500; // Duration in milliseconds (e.g., 2.5 seconds)

    if (introScreen && mainFormContainer) {
        console.log("Intro screen and main form container found.");
        // Hide intro and show form after a delay
        setTimeout(() => {
            console.log("Hiding intro screen...");
            introScreen.classList.add('hidden'); // Trigger fade-out CSS

            // Optional: Listen for transition end on introScreen before showing main form for perfect sync
            // introScreen.addEventListener('transitionend', () => {
            //    mainFormContainer.classList.add('visible');
            // }, { once: true });
            // For simplicity, we'll just use another timeout or direct class add for form fade-in

            // Show the main form container (trigger its fade-in)
            // A slight delay for the form to fade in after the intro starts fading out
            setTimeout(() => {
                 console.log("Showing main form container...");
                 mainFormContainer.classList.add('visible');
            }, 300); // Adjust this delay as needed, should be less than intro fade-out

        }, introDuration);
    } else {
        console.warn("Intro screen or main form container not found. Skipping intro logic.");
        if(mainFormContainer) mainFormContainer.classList.add('visible'); // Show form immediately if intro is missing
    }
    // ==== END INTRO SCREEN LOGIC ====

    // Add this line to confirm DOMContentLoaded has fired
    console.log("DOMContentLoaded event fired");

    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwB3mS-AoevSVhbpL6cKZcG1FV1JLv9goybZeC_FeFISZM1HU7_YtVxpJTmT2VjL3Dx/exec'; // Your Web App URL

    const formPages = document.querySelectorAll('fieldset[id^="page"]');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const ecommerceSelect = document.getElementById('ecommerce');
    const ecommerceDetailsGroup = document.getElementById('ecommerceDetailsGroup');

    // Log selected elements to ensure they are not null
    console.log("Selected formPages:", formPages); // Should be a NodeList of 6 fieldsets
    console.log("Selected nextBtn:", nextBtn);     // Should be the Next button element
    console.log("Selected prevBtn:", prevBtn);     // Should be the Previous button element
    console.log("Selected currentPageSpan:", currentPageSpan); // Should be the span for current page number
    console.log("Selected totalPagesSpan:", totalPagesSpan);   // Should be the span for total pages number
    console.log("Selected ecommerceSelect:", ecommerceSelect);
    console.log("Selected ecommerceDetailsGroup:", ecommerceDetailsGroup);

    // NEW: Add event listener for the e-commerce select dropdown
    if (ecommerceSelect && ecommerceDetailsGroup) { // Make sure both elements exist
        ecommerceSelect.addEventListener('change', function() {
            console.log("E-commerce dropdown changed. Selected value:", this.value); // 'this' refers to ecommerceSelect
            if (this.value === 'yes_full_store' || this.value === 'yes_simple_payments') {
                ecommerceDetailsGroup.style.display = 'block';
                console.log("Showing e-commerce details group.");
            } else {
                ecommerceDetailsGroup.style.display = 'none';
                console.log("Hiding e-commerce details group.");
            }
        });
    } else {
        if (!ecommerceSelect) console.warn("Warning: ecommerceSelect element not found.");
        if (!ecommerceDetailsGroup) console.warn("Warning: ecommerceDetailsGroup element not found.");
    }

    // Helper function to remove previous error messages and styles
    function clearAllErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.remove());

        const errorInputs = document.querySelectorAll('.input-error');
        errorInputs.forEach(input => input.classList.remove('input-error'));
    }

    // NEW: Validation Function
    function validateCurrentPage() {
        clearAllErrors(); // Clear previous errors first
        let isValid = true;
        const currentPageFieldset = document.getElementById(`page${currentPage}`);
        
        // Select all visible input, select, and textarea elements within the current page that are required
        const requiredFields = currentPageFieldset.querySelectorAll('input[required], select[required], textarea[required]');

        console.log(`Validating page ${currentPage}. Found ${requiredFields.length} required fields.`);

        for (let field of requiredFields) {
            // Check if the field is visible (its parent form-group is not display:none)
            // This handles the conditional ecommerceDetailsGroup
            let fieldContainer = field.closest('.form-group');
            if (fieldContainer && fieldContainer.style.display === 'none') {
                continue; // Skip hidden fields like the ecommerceDetails when not applicable
            }

            if (!field.value.trim()) {
                isValid = false;
                console.log(`Validation failed for: ${field.name || field.id}`);
                field.classList.add('input-error'); // Add error class to the field

                // Add an error message after the field's parent .form-group
                const errorSpan = document.createElement('span');
                errorSpan.className = 'error-message';
                let fieldLabel = field.previousElementSibling; // Try to get label
                let fieldNameForError = (fieldLabel && fieldLabel.tagName === 'LABEL') ? fieldLabel.textContent.replace(':', '') : (field.name || field.id);
                errorSpan.textContent = `${fieldNameForError} is required.`;
                
                // Insert error message. Best place is after the field or its small helper text.
                if (field.nextElementSibling && field.nextElementSibling.tagName === 'SMALL') {
                    field.nextElementSibling.insertAdjacentElement('afterend', errorSpan);
                } else {
                    field.insertAdjacentElement('afterend', errorSpan);
                }
            } else {
                field.classList.remove('input-error'); // Remove error class if field is now valid
            }
        }

        if (!isValid) {
            // Optional: Scroll to the first error field or show a general message
            const firstErrorField = currentPageFieldset.querySelector('.input-error');
            if (firstErrorField) {
                firstErrorField.focus();
                // alert("Please fill in all required fields highlighted in red.");
            }
        }
        return isValid;
    }

    // Check if essential button elements were found. If not, stop and indicate the problem.
    if (!nextBtn || !prevBtn) {
        console.error("CRITICAL: Navigation buttons not found. Check HTML IDs 'nextBtn' and 'prevBtn'.");
        return; // Stop further execution if buttons aren't found
    }
    if (!formPages || formPages.length === 0) {
        console.error("CRITICAL: No form pages (fieldsets with id starting 'page') found. Check HTML fieldset IDs.");
        return; // Stop further execution
    }


    let currentPage = 1;
    const totalPages = formPages.length;

    if (totalPagesSpan) {
        totalPagesSpan.textContent = totalPages;
    } else {
        console.warn("Warning: totalPagesSpan element not found.");
    }

    function getLegendText(pageNumber) {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            const pageFieldset = document.getElementById(`page${pageNumber}`);
            if (pageFieldset) {
                const legend = pageFieldset.querySelector('legend');
                if (legend && legend.textContent) { // Added check for legend.textContent
                    const colonIndex = legend.textContent.indexOf(':');
                    if (colonIndex !== -1) {
                        return legend.textContent.substring(colonIndex + 2).trim();
                    }
                    return legend.textContent.trim(); // Fallback if no colon
                }
            }
        }
        return null; // Return null if not found, so it can be handled
    }

    function updatePageVisibility() {
        // console.log(`updatePageVisibility called for currentPage: ${currentPage}`);
        clearAllErrors(); // Clear errors when page changes

        // Inside updatePageVisibility() in script.js
        const progressBarActual = document.getElementById('progressBarActual');
        if (progressBarActual) {
            const progressPercent = (currentPage / totalPages) * 100;
            progressBarActual.style.width = progressPercent + '%';
        }

        formPages.forEach((page, index) => {
            // Remove both classes before adding the correct one
            page.classList.remove('active-page', 'hidden-page');

            if ((index + 1) === currentPage) {
                // Delay slightly to allow the 'hidden-page' class to apply if it was just added
                // and to ensure the transition is visible.
                setTimeout(() => {
                    page.style.display = 'block'; // Make sure it's block before adding active class
                    page.classList.add('active-page');
                }, 50); // A small delay, adjust if needed
            } else {
                page.classList.add('hidden-page');
                // Set display to none after transition (if you want to remove from layout)
                // Or manage with absolute positioning and opacity as done in CSS
                // For this setup, we'll let CSS handle the visual hiding via opacity/transform
                // but ensure it's not 'block' if not active to prevent layout issues if not positioned absolutely
                // However, with position: absolute on .hidden-page, display:none is not strictly needed for visual hiding
                // but can be good for accessibility or if pointer-events:none is not enough.
                // Let's rely on the CSS for now, if issues arise, we can add: 
                // setTimeout(() => { page.style.display = 'none'; }, 500); // Match CSS transition duration
            }
        });

        if (currentPageSpan) {
            currentPageSpan.textContent = currentPage;
        } else {
            console.warn("Warning: currentPageSpan element not found.");
        }

        prevBtn.style.display = (currentPage === 1) ? 'none' : 'inline-block';

        const nextButtonBaseText = getLegendText(currentPage + 1);
        const prevButtonBaseText = getLegendText(currentPage - 1);

        if (currentPage === totalPages) {
            nextBtn.textContent = 'Submit Form';
        } else {
            nextBtn.textContent = `Next: ${nextButtonBaseText || 'Next Page'}`;
        }
        
        if (currentPage > 1) {
            prevBtn.textContent = `Previous: ${prevButtonBaseText || 'Previous Page'}`;
        }
    }

    // --- Modify the nextBtn event listener ---
    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            console.log("Next button was clicked.");

            // Only validate if not on the last page (submission has its own validation if needed)
            // Or, always validate the current page before any action
            if (currentPage < totalPages) {
                if (!validateCurrentPage()) { // Call validation function
                    console.log("Validation failed. Staying on current page.");
                    return; // Stop if validation fails
                }
                currentPage++;
                updatePageVisibility();
                window.scrollTo(0, 0); // Scroll to top of new page
            } else // This is the "Submit Form" case
            {
                // Ensure validation for the last page is also done if any required fields are on it
                if (!validateCurrentPage()) { 
                    console.log("Validation failed on the last page. Cannot submit.");
                    return; 
                }
                console.log("Submit Form button clicked - initiating data collection and sending.");
                collectAndLogFormData(); // This will now also call sendDataToBackend
            }
        });
    }
    
    if (prevBtn) { // Ensure prevBtn exists before adding listener
        prevBtn.addEventListener('click', function () {
            console.log("Previous button was clicked."); // Log click event

            if (currentPage > 1) {
                currentPage--;
                updatePageVisibility();
            }
        });
    }

    // --- MODIFIED collectAndLogFormData function ---
    function collectAndLogFormData() {
        const collectedData = {};
        const formElements = document.querySelectorAll('.form-container input, .form-container select, .form-container textarea');

        console.log("Starting data collection for submission...");
        formElements.forEach(element => {
            const name = element.name;
            const value = element.value;
            if (name) {
                if (element.type === 'radio') {
                    if (element.checked) collectedData[name] = value;
                } else if (element.type === 'checkbox') {
                    if (!collectedData[name]) collectedData[name] = [];
                    if (element.checked) collectedData[name].push(value);
                } else {
                    collectedData[name] = value;
                }
            }
        });

        console.log("--- InsightForm AI: Collected Data Object (Ready to Send) ---");
        console.log(collectedData);

        // Call the function to send data to the backend
        sendDataToBackend(collectedData);
    }

    // --- NEW FUNCTION to send data to Google Apps Script ---
    function sendDataToBackend(data) {
        const submitBtn = document.getElementById('submitBtn') || document.getElementById('nextBtn'); // Get the submit button

        // Optional: Disable button and show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }
        
        console.log("Sending data to backend:", data);

        fetch(WEB_APP_URL, {
            method: 'POST',
            // mode: 'cors', // Usually default. 'no-cors' can be used if CORS issues arise but prevents reading response.
            // cache: 'no-cache',
            // redirect: 'follow', // Default
            // referrerPolicy: 'no-referrer', // Default
            body: JSON.stringify(data) // Body data type must match "Content-Type" header if specified
                                       // For Google Apps Script doPost(e), e.postData.contents will be this string.
                                       // No explicit Content-Type header needed here, fetch defaults to text/plain for string body.
        })
        .then(response => {
            console.log("Raw response from backend:", response);
            if (!response.ok) {
                // If response is not ok (e.g., 4xx, 5xx), try to parse as JSON for error message from GAS
                // or throw an error to be caught by .catch()
                return response.json().then(err => { throw new Error(err.message || `HTTP error! Status: ${response.status}`) });
            }
            return response.json(); // Assuming Google Apps Script returns JSON
        })
        .then(result => {
            console.log("Success/Result from backend:", result);
            // alert(result.message || "Form submitted successfully!"); // REMOVE THIS ALERT

            if (result.status === 'success') {
                console.log("Redirecting to thank you page.");
                window.location.href = 'thank-you.html'; // ADD THIS LINE FOR REDIRECTION
            } else {
                // Handle specific errors from our backend if status is 'error'
                alert(result.message || "Submission processed, but an issue was reported by the server."); // Keep alert for errors
                if (submitBtn) { // Assuming submitBtn is defined in this scope
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Form';
                }
            }
        })
        .catch(error => {
            console.error("Error during fetch operation:", error);
            alert(`Submission failed: ${error.message}. Please try again or contact support.`);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Form';
            }
        });
    }

    // Initial setup call
    // console.log("Calling initial updatePageVisibility...");
    updatePageVisibility(); // This will also call clearAllErrors
    // console.log("Initial updatePageVisibility call complete.");
});

// Add this line at the VERY BOTTOM to confirm script parsing completed
console.log("END of script.js parsing");