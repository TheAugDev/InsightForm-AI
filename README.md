# InsightForm AI

An AI-enhanced client intake form designed to streamline project discovery and generate actionable insights for freelancers. This tool helps gather comprehensive client requirements efficiently and leverages AI to provide initial analysis, making the onboarding process smarter and faster.

## Purpose

The primary goal of InsightForm AI is to provide a robust, intelligent solution for freelancers to:
* Capture detailed client information and project requirements through an intuitive multi-page form.
* Reduce manual effort in summarizing initial client discussions.
* Leverage AI to extract key insights, potential challenges, and project focus areas from client input.
* Start new client engagements with clarity and a professional, tech-forward approach.

## Features (Personal Freelancing Version)

* **Interactive Multi-Page Form:** Guides clients through various aspects of project discovery (Contact, Project Overview, Audience, Design, Technical Needs).
* **Client-Side Validation:** Ensures data integrity before submission.
* **Data Submission to Google Sheets:** Securely stores all client responses for easy access and record-keeping.
* **AI-Powered Analysis (via Google Apps Script & AI API):**
    * Automated summarization of client's needs.
    * Identification of key project goals and potential ambiguities.
    * Extraction of relevant keywords and style descriptors.
* **Automated Email Brief:** Delivers the raw client data along with the AI-generated insights directly to the freelancer's inbox.

## Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend & Automation:** Google Apps Script
* **Data Storage:** Google Sheets
* **AI Integration:** Gemini API (via Google Cloud)

## Current Status

* Under active development for personal freelancing use.
* Designed collaboratively by The Augmented Developer and Brainstormer (AI Assistant).

## Setup & Installation (High-Level for Personal Use)

1.  **Clone the Repository:** `git clone https://github.com/TheAugDev/InsightForm-AI`
2.  **Frontend:**
    * Host the HTML, CSS, and JS files (e.g., using GitHub Pages for testing, or a simple static site host).
3.  **Backend (Google Workspace):**
    * Create a new Google Sheet to store form responses.
    * Create a Google Apps Script connected to the Sheet.
    * Deploy the Google Apps Script as a web app.
    * Ensure the Apps Script has permissions to modify the Sheet and send emails.
4.  **AI Integration:**
    * Obtain an API key for the Gemini API from Google AI Studio or Google Cloud Console.
    * Add the API key securely to the Google Apps Script properties.
5.  **Configuration:**
    * Update the Google Apps Script `doPost` function URL in the frontend JavaScript `Workspace` call.
    * Configure the recipient email address in the Google Apps Script.

## How to Use (Conceptual Workflow)

1.  The freelancer provides their client with a link to the InsightForm AI web form.
2.  The client fills out the multi-page form.
3.  Upon submission, the data is sent to the Google Apps Script.
4.  The Apps Script saves the data to the Google Sheet and sends relevant parts to the Gemini API for analysis.
5.  The Apps Script emails the raw data and the AI-generated summary/insights to the freelancer.
6.  The freelancer uses this enhanced brief to prepare for client meetings and project planning.

## Future Ideas

* Enhanced UI/UX and branding options.
* Direct client access to a summary page (optional).
* Version 2.0: Exploration of a potential SaaS offering for other freelancers.

---

*This tool is a product of innovative human-AI collaboration. Let's build something amazing!*
