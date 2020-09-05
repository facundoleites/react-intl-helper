import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getConfigurations, getConfigurationValue } from './utils';
export class TranslationsProvider implements vscode.TreeDataProvider<TranslationFile> {
    private _onDidChangeTreeData: vscode.EventEmitter<TranslationFile | undefined | void> = new vscode.EventEmitter<TranslationFile | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TranslationFile | undefined | void> = this._onDidChangeTreeData.event;
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
    constructor() {}
    getTreeItem(element: TranslationFile): TranslationFile {
        return element;
    }
    getChildren(): Thenable<TranslationFile[]> {
        return vscode.window.withProgress(
            {
                location:{viewId:'react-intl-helper-tree-view'}
            },
            ()=>new Promise<TranslationFile[]>(
                (resolve,reject)=>{
                    if(!vscode.workspace.workspaceFolders){
                        return reject(new Error('there is no workspaceFolders'));
                    }
                    const workspaceFolder = vscode.workspace.workspaceFolders[0];
                    const configurations = getConfigurations();
                    if(!configurations){
                        return reject(new Error('there is no configurations'));
                    }
                    const relativePath = configurations.get<string>('react-intl-helper.rootPath');
                    if(!relativePath){
                        return reject(new Error('the relativePath doesn\'t exists'));
                    }
                    const absolutePath = path.resolve(
                        workspaceFolder.uri.fsPath,
                        relativePath
                    )
                    if(!this.pathExists(absolutePath)){
                        return reject(new Error('the absolute doesn\'t exists'));
                    }
                    const files = fs.readdirSync(absolutePath);
                    return resolve(
                        files.filter(
                            file=>path.extname(file) === '.json'
                        ).map(
                            label=>new TranslationFile(
                                label.replace('.json',''),
                                path.resolve(absolutePath,label)
                            )
                        )
                    )
                }
            ).catch(
                (e:Error)=>{
                    vscode.window.showErrorMessage(e.message);
                    return []
                }
            )
        )
    }
    private pathExists(p: string): boolean {
        try {
            fs.accessSync(p);
        } catch (err) {
            return false;
        }
        return true;
    }
}

export class TranslationFile extends vscode.TreeItem {
    private _description:string;
    private _defaultLang:boolean;
    constructor(
        public readonly label: string,
        public readonly filepath: string
    ){
        super(label, vscode.TreeItemCollapsibleState.None);
        const defaultLang = getConfigurationValue('defaultLang');
        this._defaultLang = defaultLang === filepath;
        this._description = filepath;
        this.command = {
            command: "react-intl-helper.openFile",
            title: '',
            arguments: [`file:///${filepath}`]
        }
    }
    get defaultLang(): boolean{
        return this._defaultLang;
    }
    get tooltip(): string {
        return `${this.label} - ${this.description}`;
    }
    get description(): string {
        return this._description;
    }
    get iconPath(){
        return this.defaultLang?
            {
                light: path.join(__dirname, '..', 'resources', 'home-light.svg'),
                dark: path.join(__dirname, '..', 'resources', 'home-dark.svg')
            }
        :
            {
                light: path.join(__dirname, '..', 'resources', 'translation-light.svg'),
                dark: path.join(__dirname, '..', 'resources', 'translation-dark.svg')
            }
    }
}