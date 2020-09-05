import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { onFileActive } from './editor';

export const getConfigurations = () => {
    if(!vscode.workspace.workspaceFolders){
        return;
    }
    const folder = vscode.workspace.workspaceFolders[0];
    return vscode.workspace.getConfiguration('',folder);
}
export const getConfigurationValue = <T>(conf:string):T|undefined => {
    const configurations = getConfigurations();
    if(!configurations){
        return;
    }
    return configurations.get<T>(`react-intl-helper.${conf}`);
}
export const isTranslationFile = (file:string) => {
    const rootPathCfg = getConfigurationValue<string>('rootPath');
    if(!rootPathCfg || !vscode.workspace.workspaceFolders){
        return false;
    }
    const rootPath = path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath,rootPathCfg);
    //TODO verify how to check this correctly
    const filename = path.basename(file);
    return file === path.resolve(rootPath,filename)
}

export const setDefaultLang = async (newDefaultLang:string,remove:boolean=false) => {
    try{
        const configurations = getConfigurations();
        if(!configurations){
            throw new Error('there is no configurations');
        }
        if(remove){
            configurations.update(
                'react-intl-helper.defaultLang',
                undefined,
                vscode.ConfigurationTarget.WorkspaceFolder
            )
        }else{
            configurations.update(
                'react-intl-helper.defaultLang',
                newDefaultLang,
                vscode.ConfigurationTarget.WorkspaceFolder
            )
        }
    }catch(e){
        vscode.window.showErrorMessage(e.message);
        return;
    }
}
export const setLangPath = async (path?:string) => {
	try{
		let newPath:string;
		if(path){
			newPath = path;
		}else{
            let currentPath = getConfigurationValue<string>('rootPath') || '';
			newPath = await vscode.window.showInputBox(
				{
					value:currentPath
				}
			) || ''
		}
		const configurations = getConfigurations();
		if(!configurations || !newPath){
			return;
        }
		await configurations.update(
			'react-intl-helper.rootPath',
			newPath,
			vscode.ConfigurationTarget.WorkspaceFolder
		);
		return newPath;
	}catch(e){
		vscode.window.showErrorMessage(JSON.stringify({e}));
		return;
	}
}

type TranslationType = {
    defaultMessage:string,
    description?:string
};
export const getTranslations = async (
    path:string
):Promise<undefined|{[id:string]:TranslationType}> => {
    try{
        const readedFile = await fs.readFileSync(path,'utf8');
        const parsedFile = JSON.parse(readedFile);
        return parsedFile;
    }catch(e){
        return;
    }
}

export const verifyActiveEditor = (e:vscode.TextEditor | undefined) => {
    if(!e || !isTranslationFile(e.document.fileName)){
        return onFileActive(false);
    }
    return onFileActive(e);
}