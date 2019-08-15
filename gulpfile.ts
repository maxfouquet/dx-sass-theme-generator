import { Gulpclass, Task, SequenceTask } from 'gulpclass';
import { ErrnoException } from 'fast-glob/out/types';
import * as fs from 'fs';
import * as gulp from 'gulp';
import * as del from 'del';
import * as sass from 'gulp-sass';
import * as gutil from 'gulp-util';
import * as rename from 'gulp-rename';
import * as replace from 'gulp-replace';

var merge = require('merge-stream');
var header = require('gulp-header');

@Gulpclass()
export class Gulpfile {

    private module: string = 'dx-sass-theme-generator';

    private required_vars: Array<string> = ['$primary-color'];

    private repository: string = './src/main/import/';
    private sass_resources: string = './src/main/resources/sass/resources/';
    private sass_themes: string = './src/main/resources/sass/themes/';
    private themes_folder: string ='./src/main/import/content/modules/' + this.module + '/templates/files/themes/';

    private themes: Array<string> = [];

    /*
    * Outputs themes as Xml
    */
    getXml(): string {
        let themes_xml = '<themes jcr:mixinTypes="jmix:hasExternalProviderExtension" jcr:primaryType="jnt:folder">';
        this.themes = fs.readdirSync(this.themes_folder);
        this.themes.map((theme: string) => {
            themes_xml += '<' + theme + ' jcr:primaryType="jnt:folder">';
            let cssFolders = fs.readdirSync(this. themes_folder + theme);
            cssFolders.map((css_file: string) => {
                themes_xml += '<' + css_file + ' jcr:primaryType="jnt:file"><jcr:content jcr:mimeType="text/css" jcr:primaryType="jnt:resource"/></' + css_file + '>';
            });
            themes_xml += '</' + theme + '>';
        });
        themes_xml += '</themes>';
        return themes_xml;
    }

    /*
    * Clean all css files inside themes folder
    */
    @Task('clean')
    clean() {
        return del([this.themes_folder + '/**/*.css']);
    }

    /*
    * Store themes in array
    */
    @Task('init')
    init() {
        return gulp.src(this.sass_themes + '*.scss')
            .pipe(rename((path: any) => {
                this.themes.push(path.basename);
            }));
    }


    /*
    * Compile Sass to CSS
    */
    @Task('build')
    build() {
        let tasks = this.themes.map((theme) => {
            
            fs.readFile(this.sass_themes + theme + '.scss', 'utf8', (err: ErrnoException | null, data: string) => {
                if (err) {
                    throw new gutil.PluginError({
                        plugin: 'build',
                        message: 'Main file doesn\'t exist for the theme: ' + theme
                    });
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
                                throw new gutil.PluginError({
                                    plugin: 'build',
                                    message: 'Required variable ' + required_var + ' is not defined'
                                });
                            };
                        }
                    });
                }
            });

            return gulp.src(this.sass_resources + '*.scss')
                .pipe(header('@import \'../themes/' + theme + '.scss\';'))
                .pipe(sass.sync().on('error', gutil.log))
                .pipe(rename((path: any) => {
                    let file = path.basename + path.extname;
                    path.dirname += '/' + file;
                }))
                .pipe(gulp.dest(this.themes_folder + '/' + theme));

        });

        return merge(tasks);
    }

    /*
    * Write xml files
    */
    @Task('end')
    end() {
        return gulp.src([this.repository + 'repository.xml', this.repository + 'repository.xml.generated'])
        .pipe(replace(/<themes[^>]*>([\s\S]*?)<\/themes>/, this.getXml()))
        .pipe(gulp.dest(this.repository));
    }

    @SequenceTask()
    run() {
        return ['clean', 'init', 'build', 'end'];
    }
}