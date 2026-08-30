// TODO: replace this with your real API call. Should resolve with the bot's reply text.
export async function getBotReply(documentText, topic) {

  try {
    const response = await fetch('http://127.0.0.1:8000/generate_notes', {
      method: 'POST',
      headers: {
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({document_text: documentText, topic: topic}),
    })

    if (!response.ok) {
      throw new Error("Error")
    }

    const data = await response.json();
    console.log('Success: ', data)

    return data.notes
    
  } catch (error) {
    console.log('Error', error);
  }

}
