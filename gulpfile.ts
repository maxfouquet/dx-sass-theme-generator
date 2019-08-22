import { Gulpclass, Task, SequenceTask } from 'gulpclass';
import { ErrnoException } from 'fast-glob/out/types';
import merge from 'merge-stream';
import fs from 'fs';
import gulp from 'gulp';
import del from 'del';
import sass from 'gulp-sass';
import rename from 'gulp-rename';
import replace from 'gulp-replace';
import header from 'gulp-header';
import PluginError from 'plugin-error';
import log from 'fancy-log';

@Gulpclass()
export class Gulpfile {

    private module: string = 'dx-sass-theme-generator';

    private required_vars: Array<string> = ['$primary-color'];

    private repository: string = './src/main/import/';
    private sass_resources: string = './src/main/resources/sass/resources/';
    private sass_themes: string = './src/main/resources/sass/themes/';
    private themes_folder: string ='./src/main/import/content/modules/' + this.module + '/templates/files/themes/';

    private themes: Array<string> = fs.readdirSync(this.sass_themes);


    /*
    * Clean all css files inside themes folder
    */
    @Task('clean')
    clean(): Promise<string[]> {
        return del([this.themes_folder + '/**/*.css']);
    }

    /*
    * Initial error handler
    */
    errorHandler(theme: string): boolean | any {
        fs.readFile(this.sass_themes + theme + '/theme.scss', 'utf8', (err: ErrnoException | null, data: string) => {
            if (err) {
                return {
                    plugin: 'build',
                    message: 'Sass file doesn\'t exist for the theme: ' + theme
                };
            } else {
                let vars = data.match(/\$(.*?)\:/g);
                this.required_vars.map(required_var => {
                    if(vars !== null){
                        let varEx = false;
                        vars.map(a => { 
                            if(a.indexOf(required_var) > -1){ 
                                varEx = true; 
                            }
                        });
                        if(!varEx){
                            return {
                                plugin: 'build',
                                message: 'Required variable ' + required_var + ' is not defined for the theme: ' + theme
                            };
                        };
                    }
                });
            }
        });
        return false;
    }

    /*
    * Compile Sass to CSS
    */
    @Task('build')
    build(): any {
        log('Building [' + this.themes + ']');

        let tasks: any = this.themes.map((theme: string) => {
            let subtasks = [];

            let errorHandler = this.errorHandler(theme);
            if(errorHandler){
                throw new PluginError(errorHandler);
            }

            // Copying web fonts
            subtasks.push(gulp.src(this.sass_themes + theme + '/fonts/*.{ttf,woff,woff2,eof,svg}')
                .pipe(rename((path: any) => {
                    path.dirname += '/' + path.basename + path.extname;
                }))
                .pipe(gulp.dest(this.themes_folder + theme + '/fonts')));

            // Processing additional sass theme
            subtasks.push(gulp.src(this.sass_themes + theme + '/addons/*.scss')
                .pipe(header('@import \'../theme.scss\';'))
                .pipe(sass.sync().on('error', log))
                .pipe(rename((path: any) => {
                    path.dirname += '/' + path.basename + path.extname;
                }))
                .pipe(gulp.dest(this.themes_folder + theme)));

            // Processing general sass theme
            subtasks.push(gulp.src(this.sass_resources + '*.scss')
                .pipe(header('@import \'../themes/' + theme + '/theme.scss\';'))
                .pipe(sass.sync().on('error', log))
                .pipe(rename((path: any) => {
                    path.dirname += '/' + path.basename + path.extname;
                }))
                .pipe(gulp.dest(this.themes_folder + theme)));

            return subtasks;
        });

        return merge(tasks);
    }

    /*
    * Outputs themes as Xml
    */
   getXml(): string {
        let themes_xml = `<themes jcr:mixinTypes="jmix:hasExternalProviderExtension" jcr:primaryType="jnt:folder">`;
        this.themes = fs.readdirSync(this.themes_folder);
        this.themes.map((theme: string) => {
            let css_folders = fs.readdirSync(this.themes_folder + theme);
            themes_xml += `<${theme} jcr:primaryType="jnt:folder">`;
            css_folders.map((css_file: string) => {
                themes_xml += `<${css_file} jcr:primaryType="jnt:file"><jcr:content jcr:mimeType="text/css" jcr:primaryType="jnt:resource"/></${css_file}>`;
            });
            themes_xml += `</${theme}>`;
        });
        themes_xml += `</themes>`;
        return themes_xml;
    }

    /*
    * Write xml files
    */
    @Task('end')
    end(): any {
        return gulp.src([this.repository + 'repository.xml', this.repository + 'repository.xml.generated'])
            .pipe(replace(/<themes[^>]*>([\s\S]*?)<\/themes>/, this.getXml()))
            .pipe(gulp.dest(this.repository));
    }

    @SequenceTask()
    run() {
        return ['build', 'end'];
    }
}