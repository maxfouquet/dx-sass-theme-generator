# DX Sass Theme Generator

Build your own Jahia DX themes with Sass

## Define your themes manually or using Studio

```
|-- src
|   |-- main
        |-- resources
            |-- sass
                |-- resources
                    |-- <resource>.scss
                |-- themes
                    |-- <theme>
                        |-- theme.scss
                        |-- addons
                            |-- <addon>.scss
                        |-- fonts
|-- .gitignore
|-- gulpfile.ts
|-- package.json
|-- pom.xml
|-- README.md
|-- tsconfig.json
```

## Build your template set

```
mvn clean install jahia:deploy -P <profile>
```

# That's it
