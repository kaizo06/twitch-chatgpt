import { Groq } from 'groq-sdk';

export class GroqOperations {
  constructor(context, apiKey, modelName, historyLength) {
    this.context = context;
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.historyLength = historyLength;
    this.groq = new Groq({ apiKey });
    this.messages = [{role: 'system', content: context }];
  }

  async make_openai_call(text) {
    this.messages.push({role: 'user', content: text});
    const completion = await this.groq.chat.completions.create({
      model: this.modelName || 'llama3-8b-8192',
      messages: this.messages.slice(-(this.historyLength * 2 + 1)),
      max_tokens: 200,
      temperature: 0.7
    });
    const response = completion.choices[0].message.content.trim();
    this.messages.push({role: 'assistant', content: response});
    return response;
  }

  async make_openai_call_completion(prompt) {
    return await this.make_openai_call(prompt);
  }
}
