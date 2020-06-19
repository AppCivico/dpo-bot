import accents from "remove-accents";
import { sendMainMenu } from "./dialogs";
import chatbotAPI from "../chatbot_api.js";
import { issueText } from "./flow.js";
import { duvidas } from "./flow.js";
import { getRandomArray } from "./helper.js";

const blacklist = ['sim', 'nao'];
const timeToWait = process.env.ISSUE_TIME_WAIT;

async function formatString(text) {
	let result = text.toLowerCase();
	result = await result.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2580-\u27BF]|\uD83E[\uDD10-\uDDFF])/g, '');
	result = await result.replace(/´|~|\^|`|'|0|1|2|3|4|5|6|7|8|9|/g, '');
	result = await accents.remove(result);
	return result.trim();
}

async function endProcess(context, answer, successText, failureText) {
	if (timeToWait) await context.typing(timeToWait);
	console.log('created issue?', answer);
	if (answer && answer.id) {
		if (successText) await context.sendText(successText);
		return true;
	}
	if (failureText) await context.sendText(failureText);
	return false;
}

// check if we should create an issue with that text message.If it returns true, we send the appropriate message.
async function createIssue(context) {
	// check if text is not empty and not on the blacklist
	const cleanString = await formatString(context.state.whatWasTyped);
	if (cleanString && cleanString.length > 0 && !blacklist.includes(cleanString)) {
		if (context.session.platform === 'browser') {
			if (context.state.userEmail) {
				await chatbotAPI.postRecipient(context.state.politicianData.user_id, { uuid: context.session.user.id, email: context.state.userEmail });

				await context.setState({ originalDuvida: `${context.state.originalDuvida}\n\nO e-mail desse usuário é: ${context.state.userEmail}` });
				const issueResponse = await chatbotAPI.postIssue(context.state.politicianData.user_id, context.state.recipientID, context.state.originalDuvida,
					context.state.resultParameters ? context.state.resultParameters : {}, context.state.politicianData.issue_active);

				await endProcess(context, issueResponse, duvidas.success, duvidas.failure);
				await context.setState({ dialog: 'null' });
				await sendMainMenu(context);
			} else {
				await context.setState({ originalDuvida: context.state.whatWasTyped });
				await context.setState({ dialog: 'askEmailDuvida' });
			}
		} else {
			const issueResponse = await chatbotAPI.postIssue(context.state.politicianData.user_id, context.state.recipientID, context.state.whatWasTyped,
				context.state.resultParameters ? context.state.resultParameters : {}, context.state.politicianData.issue_active);
			await endProcess(context, issueResponse, getRandomArray(issueText.success), issueText.failure);
			await context.setState({ dialog: 'mainMenu' });
		}
	}
}
export { createIssue, formatString };
