import { TOOL_DESCRIPTORS } from "./core/contracts.js";

const homeGrid = document.getElementById("tool-cards-home");
const directoryGrid = document.getElementById("tools-directory-grid");
const compareBody = document.getElementById("tools-compare-body");

function categorySlug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function cardTemplate(tool) {
  const categoryClass = categorySlug(tool.category);
  return `<article class="tool-card" data-category="${categoryClass}">
    <span class="badge ${categoryClass}">${tool.category}</span>
    <h3>${tool.title}</h3>
    <p>${tool.summary}</p>
    <p class="microcopy"><strong>Intent:</strong> ${tool.intent}</p>
    <p class="microcopy"><strong>Difficulty:</strong> ${tool.difficulty} | <strong>Time:</strong> ${tool.estimatedTime}</p>
    <a class="cta-secondary" href="${tool.route}">${tool.primaryCta}</a>
  </article>`;
}

if (homeGrid) {
  const featured = TOOL_DESCRIPTORS
    .filter((tool) => tool.featuredOnHome)
    .sort((left, right) => (left.homeOrder || 0) - (right.homeOrder || 0));
  homeGrid.innerHTML = featured.map(cardTemplate).join("");
}

if (directoryGrid) {
  directoryGrid.innerHTML = TOOL_DESCRIPTORS.map(cardTemplate).join("");
}

if (compareBody) {
  const impactFromEvidence = {
    "Standards-Based": "High",
    "Operational Best Practice": "High",
    "Behavioral Guidance": "Medium"
  };

  compareBody.innerHTML = TOOL_DESCRIPTORS.map((tool) => {
    const impact = impactFromEvidence[tool.evidenceLevel] || "High";
    return `<tr>
      <td><a href="${tool.route}">${tool.title}</a></td>
      <td>${tool.category}</td>
      <td>${tool.estimatedTime}</td>
      <td>${tool.difficulty}</td>
      <td>${impact}</td>
    </tr>`;
  }).join("");
}

