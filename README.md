# Jupyter Coder

This plugin is still in development. To test it, clone this repository first.
Currently it only supports OPENAI code completion.

## Installation
```bash
git clone this_repo
```

Open chrome://extensions/ in your browser and enable developer mode. Then click on "Load unpacked" and select the folder where you cloned this repository.
Then click on the extension icon to enable it, you will need to enter the bigcode model endpoint url.

## Demo

```bash
cd examples
jupyter notebook
```

Open the notebook sklearn_digits.ipynb and try it out.
Type ctrl+space to trigger the code completion when you are in a code cell, then ctrl to accept it (welcome your thought on the key binding!).