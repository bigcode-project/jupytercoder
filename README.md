# Jupyter Coder

This plugin is still in development. To test it, clone this repository first.
Currently it supports the native jupyter mode of starcoder and Open AI completion API.

## Installation
```bash
git clone https://github.com/bigcode-project/jupytercoder.git
```

Open chrome://extensions/ in your browser and enable developer mode.
![devmode](https://user-images.githubusercontent.com/6381544/236060575-1fbb4024-165d-491f-8ae6-450c50b7a66d.png)

Then click on "Load unpacked" and select the folder where you cloned this repository.
![unpack](https://user-images.githubusercontent.com/6381544/236060695-c432a612-bfeb-4708-909a-f1bb8a64f732.png)

Then click on the extension icon to enable it, you will need to enter the bigcode model endpoint url https://api-inference.huggingface.co/models/bigcode/starcoder/ and your hf readonlys api key. Click save to activate this mode.
![image](https://user-images.githubusercontent.com/6381544/236060887-5c7fd3b1-d5f7-4b86-8282-8925ed867825.png)

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
