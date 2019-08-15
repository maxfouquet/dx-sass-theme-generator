# DX Sass Theme Generator

Build your own Jahia DX themes with Sass

## Define your template set and your themes as empty folders using Studio

### Templates structure

```
|-- content
|-- files
|-- home.page
|-- templates
|   |-- contents
|   |-- files
|       |-- themes
|           |-- cerulean
|           |-- meteria
```

### Content structure

```
|-- templates
|   |-- base.Template
|       |-- home.pageTemplate
```

## Build your template set

```
mvn clean install jahia:deploy -P <profile>
```

# That's it
