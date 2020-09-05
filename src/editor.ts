import * as vscode from 'vscode';
import { getTranslations, getConfigurationValue } from './utils';
export const onFileActive = async (
    e:vscode.TextEditor|false
) => {
    try{
        if(e){
            const defaultLangPath = getConfigurationValue<string>('defaultLang');
            if(!defaultLangPath){
                return;
            }
            const text = e.document.getText();
            if(!text){
                return;
            }
            const defaultData = await getTranslations(defaultLangPath);
            if(!defaultData){
                return;
            }
            const thisLangData = JSON.parse(text);
            const thisLangKeys = Object.keys(defaultData).map(
                defaultKey=> typeof thisLangData[defaultKey] === 'undefined' ? defaultKey : false
            )
            const missingTranslations = [...thisLangKeys].filter(Boolean) as string[];
            if(missingTranslations.length){
                enum ADD_TRANSLATION {
                    'ADD'='Add',
                    'ADD_WITHOUT'='Add blank',
                    'CANCEL'='cancel'
                }
                const response = await vscode.window.showInformationMessage(
                    `add missing translations to ${e.document.fileName}?`,
                    ADD_TRANSLATION.ADD,
                    ADD_TRANSLATION.ADD_WITHOUT,
                    ADD_TRANSLATION.CANCEL
                )
                if(response === ADD_TRANSLATION.ADD || response === ADD_TRANSLATION.ADD_WITHOUT){
                    const missingTranslationsAddValue:{[key:string]:{defaultMessage:string}} = {};
                    missingTranslations.forEach(
                        (key)=>{
                            missingTranslationsAddValue[key] = {
                                defaultMessage:response === ADD_TRANSLATION.ADD?
                                    defaultData[key].defaultMessage
                                :
                                    ''
                            }
                        }
                    )
                    await e.edit(
                        (eb)=>{
                            eb.delete(
                                new vscode.Range(
                                    new vscode.Position(0,0),
                                    e.document.positionAt(e.document.getText().length)
                                )
                            )
                            eb.insert(
                                new vscode.Position(0,0),
                                JSON.stringify(
                                    Object.assign({},thisLangData,missingTranslationsAddValue)
                                )
                            )
                        }
                    )
                    await vscode.commands.executeCommand('editor.action.formatDocument');
                }
            }

        }
    }catch(e){
        vscode.window.showErrorMessage(e.message);
        return;
    }
}

export class TranslationsPanel {
	public static currentPanel: TranslationsPanel | undefined;
	public static readonly viewType = 'react-intl-helper-panel';
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.Beside;
		// If we already have a panel, show it.
		if (TranslationsPanel.currentPanel) {
			TranslationsPanel.currentPanel._panel.reveal(column);
			return;
		}
		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
            TranslationsPanel.viewType,
			'Translations',
			column,
			{
				// Enable javascript in the webview
				enableScripts: true,
				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
			}
		);
		TranslationsPanel.currentPanel = new TranslationsPanel(panel, extensionUri);
	}
	public static revive(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri
    ){
        TranslationsPanel.currentPanel = new TranslationsPanel(panel, extensionUri);
	}
	private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri
    ){
        this._panel = panel;
		this._extensionUri = extensionUri;
		// Set the webview's initial html content
		this._update();
		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);
		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}
	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}
	public dispose() {
		TranslationsPanel.currentPanel = undefined;
		// Clean up our resources
		this._panel.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
    }
    private _panelContent:string = 'home';
    set panelContent(newpanelContent:string ){
        this._panelContent =  newpanelContent;
        this._update();
    }
    public static changeActive = (newActive:string) => {
        if(TranslationsPanel.currentPanel){
            TranslationsPanel.currentPanel.panelContent = newActive;
        }
    }
	private _update() {
        const webview = this._panel.webview;
        webview.html = this._getHtmlForWebview(webview);
	}
	private _getHtmlForWebview(webview: vscode.Webview) {
		return `<!DOCTYPE html>
            <html lang="en">
                <p>${this._panelContent}</t>
			</html>`;
	}
}