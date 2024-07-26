import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://mp.weixin.qq.com/*"],
  all_frames: true
}

// Content script for Chrome extension
// Enhanced Domain-Specific URL to Link Converter

const domainRules = {
  "bilibili.com": {
    selector: "#v_desc"
  },
  "mp.weixin.qq.com": {
    selector: "#page-content"
  }
  // Add other domain rules here
}

const urlRegex = /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*))/gi

function createLinkElement(url) {
  const link = document.createElement("a")
  link.href = url.startsWith("http") ? url : "https://" + url
  link.textContent = url
  link.className = "relinkit-recover-link"
  link.target = "_blank"
  return link
}

function processTextNode(textNode) {
  const fragment = document.createDocumentFragment()
  let lastIndex = 0
  let match
  let changed = false

  while ((match = urlRegex.exec(textNode.textContent)) !== null) {
    const url = match[0]
    const precedingText = textNode.textContent.slice(lastIndex, match.index)

    if (precedingText) {
      fragment.appendChild(document.createTextNode(precedingText))
    }

    fragment.appendChild(createLinkElement(url))
    changed = true

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < textNode.textContent.length) {
    fragment.appendChild(
      document.createTextNode(textNode.textContent.slice(lastIndex))
    )
  }

  return [fragment, changed]
}

function processNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const [fragment, changed] = processTextNode(node)
    if (changed) {
      node.parentNode.replaceChild(fragment, node)
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    if (
      node.nodeName !== "A" &&
      node.nodeName !== "SCRIPT" &&
      node.nodeName !== "STYLE"
    ) {
      Array.from(node.childNodes).forEach((child) => processNode(child))
    }
  }
}

function convertUrlsToLinks() {
  const currentDomain = window.location.hostname.replace("www.", "")
  const rule = domainRules[currentDomain]

  if (rule && rule.selector) {
    const elements = document.querySelectorAll(rule.selector)
    // console.log("process:link", currentDomain, rule.selector, elements)
    elements.forEach(processNode)
  } else {
    processNode(document.body)
  }
}

// Set up MutationObserver to handle dynamically added content
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      const currentDomain = window.location.hostname.replace("www.", "")
      const rule = domainRules[currentDomain]

      if (rule && rule.selector) {
        const elements = document.querySelectorAll(rule.selector)
        elements.forEach((el) => {
          if (mutation.target.contains(el) || el === mutation.target) {
            Array.from(mutation.addedNodes).forEach(processNode)
          }
        })
      } else {
        Array.from(mutation.addedNodes).forEach(processNode)
      }
    }
  })
})

function init() {
  // console.log( "=#=#= RELINKIT:injected =#=#=")

  const style = document.createElement("style")
  style.textContent = `
  .relinkit-recover-link {
      color: blue !important;
      text-decoration: underline !important;
      cursor: pointer !important;
  }
`
  document.head.appendChild(style)

  convertUrlsToLinks()
  observer.observe(document.body, { childList: true, subtree: true })
}

document.addEventListener("DOMContentLoaded", init)
window.addEventListener("load", convertUrlsToLinks)
