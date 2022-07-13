const // Подключение внешних модулей
    telegramBotApi = require('node-telegram-bot-api'),
    childProcess = require('child_process');
const { createSecureContext } = require('tls');

const // Инициализация телеграм бота
    telegramToken = '5434540575:AAFLeO97WuNFkaMqycK-IW7rlH7MAaG5WeY',
    telegramBot = new telegramBotApi(telegramToken, {polling: true})

let // Авторизованные пользователи
    authUsers = new Map();

// TODO: Прикрутить chulk модуль 
// для раскраски командной строки

telegramBot
    .on('message', async function(message) {
        if (message.text.indexOf('/') == 0)
            return commandController({
                userId: message.from.id,
                userName: `${message.from.first_name} ${message.from.last_name}`,
                commandName: message.text.slice(1).split(' ')[0],
                commandParams: message.text.slice(1).split(' ').slice(1),
            })
        return textController({
            userId: message.from.id,
            userName: `${message.from.first_name} ${message.from.last_name}`,
            textMessage: message.text,
        })
    })

function commandController(cmdData) {
    const accesComands = {
        "start": {
            access: 'all',
            handler: function() {
                authUsers.set(cmdData.userId, {
                    userName: cmdData.userName,
                })
                sendMessageByTemplate(cmdData.userId, 'Привет, {name}, рад тебя видеть!', {
                    name: cmdData.userName,
                })
                console.log(`Новый пользователь: ${cmdData.userName}. \nЧисло пользователей: ${authUsers.size}`)
            }
        },
        "end": {
            access: 'auth',
            handler: function() {
                authUsers.delete(cmdData.userId)
                sendMessageByTemplate(cmdData.userId, 'До новых встреч, {name}!', {
                    name: cmdData.userName,
                })
                console.log(`Пользователь ${cmdData.userName} вышел из чата.`)
            }
        },
        "init": {
            access: 'auth',
            handler: function() {
                sceneController(cmdData.userId).init('hello');
            }
        }
    }

    if (Object.keys(accesComands).includes(cmdData.commandName))
        switch (accesComands[cmdData.commandName].access) {
            case 'all':
                accesComands[cmdData.commandName].handler(...cmdData.commandParams)
                break
                
            case 'auth':
                if (authUsers.has(cmdData.userId)) 
                    accesComands[cmdData.commandName].handler(...cmdData.commandParams)
                break
        }
}

function textController(txtData) {

    if (authUsers.has(txtData.userId)) {
        console.log(`Пользователь ${authUsers.get(txtData.userId).userName} отправил сообщение с текстом "${txtData.textMessage}"`);
        sceneController(txtData.userId, txtData.textMessage).hasScene(function(ex) {
            ex.move(1)
        })
    }
}

function sceneController(userId, userText = null) {
    const accesScenes = {
        "hello": [
            {
                request: {
                    // Данные, которые бот отправит
                    // пользователю на этом этапе
                    type: 'text',
                    value: 'Привет, меня зовут Бот! А как твоё имя?',
                },
                response: {
                    // Ожидаем получить какой-либо ответ
                    // пользователя на вопрос бота
                    key: 'name',
                }
            },
            {
                // TODO: Добавить проверку на массив
                // если поле response является массивом
                // то отправлять каждое сообщение по очереди
                request: [
                    {
                        type: 'template',
                        value: 'Привет, {name}, рад с тобой познакомиться!',
                    },
                    {
                        type: 'text',
                        value: 'Сколько тебе лет?',
                    },
                ],
                response: {
                    valueType: Number,
                    key: 'age',
                }
            },
            {
                request: {
                    type: 'template',
                    value: 'На этом пока что закончим, я ещё не умею обрабатывать такие запросы 🤝. Но я рад, что тебе {age}',
                }
            }
        ]
    }

    function callScene(sceneName, sceneStep) {
        if (Object.keys(accesScenes).includes(sceneName)) {
            let // Scene container
                scene = null;

            if (accesScenes[sceneName][sceneStep]) {
                scene = accesScenes[sceneName][getUser().scene.step] // Id сцены до

                /* TODO: Получаем от пользователя данные, если они предусмотрены сценой до её инкрементирования */
                console.log('До инкрементирвоания:', scene)

                /* Инкрементируем сцену у пользователя */
                updateScene({
                    step: sceneStep
                })

                scene = accesScenes[sceneName][getUser().scene.step] // Id сцены после

                console.log('После инкрементированияL:',scene)

                /* TODO: Отправляем пользователю сообщение исходя из следующей сцены */

            } else
                destroyScene()
        } else
            destroyScene()
    }

    function updateScene(data = {}) {
        getUser().scene = {
            ...getUser().scene,
            ...data
        }
    }

    function createScene(sceneName) {
        getUser().scene = {
            step: null,
            name: sceneName,
            data: {},
        }
        callScene(sceneName, 0)
    }

    function destroyScene() {
        getUser().scene = null
    }

    function getUser() {
        return authUsers.get(userId);
    }

    return {
        init: function(sceneName) {
            createScene(sceneName)
        },
        move: function(target = 1) {
            const 
                sceneNema = getUser().scene.name,
                sceneStep = getUser().scene.step + target

            callScene(sceneNema, sceneStep)
        },
        destroy: function() {
            destroyScene()
        },
        hasScene: function(callBack) {
            if (getUser().scene) {
                callBack(this)
            }
        }
    }
}

function sendMessage(userId, textMessage) {
    telegramBot.sendMessage(userId, textMessage)
}

function sendMessageByTemplate(userId, messageTemplate, fields) {
    let textMessage;
    Object.keys(fields).forEach((fieldName) => {
        textMessage = messageTemplate.replace(`{${fieldName}}`, fields[fieldName])
    })
    telegramBot.sendMessage(userId, textMessage)
}
