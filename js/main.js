import { CreateWebWorkerMLCEngine } from 'https://esm.run/@mlc-ai/web-llm'

const $ = (el) => document.querySelector(el)
const $$ = (el) => document.querySelectorAll(el)

const $form = $('form')
const $input = $('textarea')
const $template = $('#message-template')
const $chatTemplate = $('#chat-template')
const $messages = $('.messages-user-bot')
const $button = $('.send-message')
const $nameModel = $('.name-model')
const $numMessages = $('.num-messages')
const $numMessagesChat = $('.num-messages-chat')
const $conversations = $('.conversations')

let messages = []
let endProgress = false
let conversationSelected = 0

const SELECTED_MODEL = 'gemma-2-2b-it-q4f32_1-MLC-1k'
$nameModel.textContent = SELECTED_MODEL

const initProgressCallback = (info) => {
  const { progress, text, timeElapsed } = info

  if (progress === 1) {
    $input.value = `${SELECTED_MODEL} Loaded in (${timeElapsed}ms)`

    setTimeout(() => {
      $button.removeAttribute('disabled')

      $input.removeAttribute('disabled')
      $input.style.color = '#8a8a8a'
      $input.value = ''

      if (!endProgress) {
        addMessage('👋 ¡Hola! Soy un asistente virtual, ¿en qué puedo ayudarte?', 'bot')
        newChat()
        endProgress = true
      }
    }, 2000)
  } else {
    $input.value = `${SELECTED_MODEL} (${text})`
    $input.setAttribute('disabled', '')
    $input.style.color = '#cfda39'
  }
}

const engine = await CreateWebWorkerMLCEngine(
  new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module'
  }),
  SELECTED_MODEL,
  { initProgressCallback: initProgressCallback }
)

$form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const messageText = $input.value.trim()

  if (messageText !== '') {
    $input.value = ''
  }

  addMessage(messageText, 'usuario')
  $button.setAttribute('disabled', '')

  const userMessage = {
    role: 'user',
    content: messageText
  }

  messages.push(userMessage)

  const chunks = await engine.chat.completions.create({
    messages,
    stream: true
  })

  let reply = ''

  const $botMessage = addMessage('...', 'bot')

  for await (const chunk of chunks) {
    const [choice] = chunk.choices
    const content = choice?.delta?.content ?? ''
    reply += content

    $botMessage.textContent = reply
  }

  $button.removeAttribute('disabled', false)
  messages.push({
    role: 'assistant',
    content: reply
  })

  $messages.scrollTop = $messages.scrollHeight
})

function addMessage(text, sender) {
  // Clone the template
  const cloneTemplate = $template.content.cloneNode(true)
  const $newMessage = cloneTemplate.querySelector('.message')
  const $who = $newMessage.querySelector('span')
  if (sender === 'bot') {
    $who.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22 14h-1c0-3.87-3.13-7-7-7h-1V5.73A2 2 0 1 0 10 4c0 .74.4 1.39 1 1.73V7h-1c-3.87 0-7 3.13-7 7H2c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h1v1a2 2 0 0 0 2 2h14c1.11 0 2-.89 2-2v-1h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1M7.5 18A2.5 2.5 0 0 1 5 15.5c0-.82.4-1.54 1-2l3.83 2.88C9.5 17.32 8.57 18 7.5 18m9 0c-1.07 0-2-.68-2.33-1.62L18 13.5c.6.46 1 1.18 1 2a2.5 2.5 0 0 1-2.5 2.5"></path></svg>'
  } else {
    $who.remove()
  }

  const $text = $newMessage.querySelector('p')
  $text.textContent = text

  // counter messages
  const $numMsg = $(`#msg-${conversationSelected}`)

  if ($numMsg) {
    const numMsgs = Number($numMsg.textContent) + 1
    $numMsg.textContent = numMsgs
    $numMessagesChat.textContent = numMsgs
  }

  // Add classList
  $newMessage.classList.add(sender)
  // Append to the list
  $messages.appendChild($newMessage)
  // Update scroll
  $messages.scrollTop = $messages.scrollHeight

  return $text
}

function newChat() {
  const conversations = clearConversations()

  const date = new Date()
  const dateTime = date.toLocaleString()

  const structNewConversation = {
    id: conversations.length,
    name: 'Nueva conversación',
    date: dateTime,
    messages: 0
  }

  conversationSelected = conversations.length

  conversations.push(structNewConversation)

  const newConversation = JSON.stringify(conversations)
  localStorage.setItem('conversations', newConversation)

  refreshConversations()
}

function clearConversations() {
  const conversations = JSON.parse(localStorage.getItem('conversations')) ?? []
  const newConversations = conversations.filter((conversation) => conversation.messages !== 0)

  return newConversations
}

function refreshConversations() {
  const conversations = JSON.parse(localStorage.getItem('conversations'))

  $conversations.innerHTML = ''

  conversations.reverse().forEach((conversation) => {
    const { date, id, messages, name } = conversation

    const element = componentInfoConversation({ date, id, messages, name })
    $conversations.appendChild(element)
  })
}

function componentInfoConversation({ date, id, messages, name }) {
  const cloneChatTemplate = $chatTemplate.content.cloneNode(true)

  const $deleteChat = cloneChatTemplate.querySelector('.close-conversation')
  const $dateChat = cloneChatTemplate.querySelector('.date-chat')
  const $titleChat = cloneChatTemplate.querySelector('.title')
  const $numMessagesChat = cloneChatTemplate.querySelector('.num-messages')

  $titleChat.textContent = name
  $dateChat.textContent = date

  $numMessagesChat.setAttribute('id', `msg-${id}`)
  $numMessagesChat.textContent = messages

  $deleteChat.setAttribute('id', `conv-${id}`)

  return cloneChatTemplate
}
