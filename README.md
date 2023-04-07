# Jupyter Coder

This plugin is still in development. To test it, clone this repository first.
Currently it only supports OPENAI code completion.

## Installation
```bash
git clone this_repo
```

change the OPENAI_API_KEY in content.js to your own key.

Open chrome://extensions/ in your browser and enable developer mode. Then click on "Load unpacked" and select the folder where you cloned this repository.

## Demo

```bash
cd examples
jupyter notebook
```

Open the notebook sklearn_digits.ipynb and try it out.
Type ctrl+space to trigger the code completion when you are in a code cell.