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

In case you encounter issue, you might want to install the same jupyter notebook version
```bash
jupyter notebook --version
>>> 6.5.2
```

Open the notebook sklearn_digits.ipynb and try it out.
Type ctrl+space to trigger the code completion when you are in a code cell, then ctrl to accept it (welcome your thought on the key binding!).

## Screenshot
![image](https://user-images.githubusercontent.com/6381544/233679491-da22ed8f-595b-4428-8e59-de2d7e4be1f0.png)
