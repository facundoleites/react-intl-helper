import * as vscode from 'vscode';
import { TranslationsProvider, TranslationFile } from './treeview';
import { isTranslationFile, setLangPath, setDefaultLang, getTranslations, getConfigurationValue, verifyActiveEditor } from './utils';
import { onFileActive, TranslationsPanel } from './editor';
import * as json from 'jsonc-parser';
export async function activate(context: vscode.ExtensionContext) {
	const translationsTree = new TranslationsProvider();
	vscode.window.createTreeView(
		'react-intl-helper-tree-view',
		{
			treeDataProvider:translationsTree
		}
	)
	// Make sure we register a serializer in activation event
	vscode.window.registerWebviewPanelSerializer(
		TranslationsPanel.viewType,
		{
			deserializeWebviewPanel: async (
				webviewPanel: vscode.WebviewPanel
			) => {
				TranslationsPanel.revive(webviewPanel, context.extensionUri);
			}
		}
	);
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection(
			async (e)=>{ 
				if(e.selections){
					const sel = [...e.selections].pop();
					const text = vscode.window.activeTextEditor?.document.getText();
					const defaultLangPath = getConfigurationValue<string>('defaultLang');
					if(!text || !sel || !defaultLangPath){
						return;
					}
					const defaultData = await getTranslations(defaultLangPath);
					const selectedJSONPos = json.getLocation(text,e.textEditor.document.offsetAt(sel.start));
					const parentNode = [...selectedJSONPos.path].shift();
					if(!parentNode || !defaultData){
						return;
					}
					const thisData = defaultData[parentNode];
					const thisLangData = JSON.parse(text);
					const thisLangKeys = Object.keys(defaultData).map(
						defaultKey=> typeof thisLangData[defaultKey] === 'undefined' ? defaultKey : false
					)
					const missingTranslations = [...thisLangKeys].filter(Boolean) as string[];
					const missingTranslationsText = missingTranslations.map(
						thisKey=> `<tr>
							<td>${thisKey}</td>
							<td>
								${defaultData[thisKey].defaultMessage}
								${
									defaultData[thisKey].description?
										`<br/><small>description: ${defaultData[thisKey].description}</small>`
									:
										``
								}
							</td>
						</tr>`
					).join('\n');
					TranslationsPanel.changeActive(`
						<!doctype html>
						<html lang="en">
							<head>
								<meta charset="utf-8">
								<meta name="viewport" content="width=device-width, initial-scale=1.0">
								<style>
									font-size:16px;
								</style>
							</head>
							<body>
								<h1>Translations</h1>
								<article>
									<header>
										<h2>Translation ${parentNode}</h2>
									<main>
										<code>${thisData.defaultMessage}</code>
										${
											thisData.description?
												`<p><strong>description:</strong> ${thisData.description}</p>`
											:
												``
										}
									</main>
								</article>
								<article>
									<header><h2>Missing translations</h2></header>
									<table>
										<thead>
											<tr>
												<th>id</th>
												<th>defaultMessage</th>
											</tr>
										</thead>
										<tbody>
											${missingTranslationsText}
										</tbody>
									</table>
								</article>
							</body>
						</html>
					`);
				}
			}
		)
	)
	//verify is an translation file is alredy open on activate
	verifyActiveEditor(vscode.window.activeTextEditor);
	context.subscriptions.push(
		//detect when a translation file is opened
		vscode.window.onDidChangeActiveTextEditor(
			verifyActiveEditor
		)
	)
	context.subscriptions.push(
		//detect configuration changes
		vscode.workspace.onDidChangeConfiguration(
			(e)=>{
				if(vscode.workspace.workspaceFolders){
					const folder = vscode.workspace.workspaceFolders[0];
					const changedRoot = e.affectsConfiguration(
						'react-intl-helper.rootPath',
						folder
					);
					const changedDefaultLang = e.affectsConfiguration(
						'react-intl-helper.defaultLang',
						folder
					);
					if(changedRoot || changedDefaultLang){
						vscode.commands.executeCommand(
							'react-intl-helper.refresh'
						);
					}
				}
			}
		)
	)
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'react-intl-helper.openPanel',
			() => {
				TranslationsPanel.createOrShow(context.extensionUri)
			}
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'react-intl-helper.refresh',
			() => {
				translationsTree.refresh()
			}
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'react-intl-helper.setLangPath',
			async (path?:string) => {
				await setLangPath(path);
				setDefaultLang('',true);
			}
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'react-intl-helper.setDefaultLang',
			(item:TranslationFile) =>  setDefaultLang(item.filepath)
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'react-intl-helper.openFile',
			filepath => vscode.commands.executeCommand(
				'vscode.open',
				vscode.Uri.parse(
					filepath
				)
			)
		)
	);
}
export function deactivate() {}
