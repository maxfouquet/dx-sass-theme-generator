import { Gulpclass, Task, SequenceTask } from 'gulpclass';
import { ErrnoException } from 'fast-glob/out/types';
import * as fs from 'fs';
import * as gulp from 'gulp';
import * as del from 'del';
import * as sass from 'gulp-sass';
import * as gutil from 'gulp-util';
import * as rename from 'gulp-rename';

var merge = require('merge-stream');
var header = require('gulp-header');

@Gulpclass()
export class Gulpfile {

    private pattern: string = '*.scss';
    private repositoryXml: string = './src/main/import/repository.xml';
    private repositoryXmlGenerated: string = './src/main/import/repository.xml.generated';
    private resourcesFolder: string = './src/main/resources/sass/resources/';
    private mainFilesFolder: string = './src/main/resources/sass/themes/';
    private themesFolder: string ='./src/main/import/content/modules/dx-sass-theme-generator/templates/files/themes/';
    private themes: Array<string> = ['cerulean', 'materia'];
    private requiredVars: Array<string> = ['$primary-color'];

    xml(path: string, content: string): void{
        fs.readFile(path, 'utf8', (err: ErrnoException | null, data: string) => {
            if (err) {
                throw new gutil.PluginError({
                    plugin: 'repository',
                    message: 'xml was not found in path' + path
                });
            } else {
                let xml = data;
                let xmlUpdated = xml.replace(/<themes[^>]*>([\s\S]*?)<\/themes>/, content);
               
                fs.writeFile(path, xmlUpdated, (err: ErrnoException | null) => {
                    if (err) {
                        throw new gutil.PluginError({
                            plugin: 'repository',
                            message: 'Can\'t override ' + path
                        });
                    }
                });
            }
        });
    }

    @Task('clean')
    clean() {
        return del([this.themesFolder + '/**/*.css']);
    }

    @Task('build')
    build() {
        let tasks = this.themes.map((theme) => {
            fs.readFile(this.mainFilesFolder + theme + '.scss', 'utf8', (err: ErrnoException | null, data: string) => {
                if (err) {
                    throw new gutil.PluginError({
                        plugin: 'build',
                        message: 'Main file doesn\'t exist for the theme: ' + theme
                    });
                } else {
                    let vars = data.match(/\$(.*?)\:/g);
                    this.requiredVars.map(requiredVar => {
                        if(vars !== null){
                            let varEx = false;
                            vars.map(a => { 
                                if(a.indexOf(requiredVar) > -1){ 
                                    varEx = true; 
                                }
                            });
                            if(!varEx){
                                throw new gutil.PluginError({
                                    plugin: 'build',
                                    message: 'Required variable ' + requiredVar + ' is not defined'
                                });
                            };
                        }
                    });
                }
            });
            
            return gulp.src(this.resourcesFolder + this.pattern)
                .pipe(header('@import \'../themes/' + theme + '.scss\';'))
                .pipe(sass.sync().on('error', gutil.log))
                .pipe(rename(function (path: any) {
                    let file = path.basename + path.extname;
                    path.dirname += '/' + file;
                }))
                .pipe(gulp.dest(this.themesFolder + '/' + theme))

        });

        return merge(tasks);
    }

    @Task()
    repository() {
        let themesXml: string = '<themes jcr:mixinTypes="jmix:hasExternalProviderExtension" jcr:primaryType="jnt:folder">';

        let themes = fs.readdirSync(this.themesFolder);
      
        themes.forEach((dir:any) => {
            themesXml += '<' + dir + ' jcr:primaryType="jnt:folder">';
            let subdirs = fs.readdirSync(this.themesFolder + dir);
            
            subdirs.forEach((file:any) => {
                themesXml += '<' + file + ' jcr:primaryType="jnt:file"><jcr:content jcr:mimeType="text/css" jcr:primaryType="jnt:resource"/></' + file + '>';
            });

            themesXml += '</' + dir + '>';
        });
        themesXml += '</themes>';

        this.xml(this.repositoryXml, themesXml);
        this.xml(this.repositoryXmlGenerated, themesXml);

        return Promise.resolve();
    }

    @SequenceTask()
    run(){
        return ['clean', 'build', 'repository'];
    }
}