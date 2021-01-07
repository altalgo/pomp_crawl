const express = require('express');
const app = express();
const body = require('body-parser');
const fs = require('fs');
const https = require('https');
const cors = require('cors');
const cheerio = require("cheerio");

try {
    const option = {
        cert: fs.readFileSync("/home/ubuntu/docker/etc/phpmyadmin/phpmyadmin/ssl/fullchain.pem"),
        key: fs.readFileSync("/home/ubuntu/docker/etc/phpmyadmin/phpmyadmin/ssl/privkey.pem")
    }
    const server = https.createServer(option, app).listen(3003, () => {
        console.log('server has started');
    })
} catch (err) {
    console.error(err);
}

app.use(cors());
app.use(body.json({
    limit: "10mb"
}));
app.use(body.urlencoded({
    limit: "10mb",
    extended: true
}));

app.use('/get', (req, res) => {
    const $ = cheerio.load(req.body.data)
    const $body = $('.freebirdFormviewerViewNumberedItemContainer');
    // console.log($($body[0]).html());
    $body.each((idx, ele) => {
        let className = $(ele).children().children().children().eq(1).attr('class');
        // console.log(className);
        console.log('제목 : ' + $(ele).find('.freebirdFormviewerComponentsQuestionBaseTitle').text());
        console.log('설명 : ' + $(ele).find('.freebirdFormviewerComponentsQuestionBaseDescription').text());
        console.log('이미지 : '+$(ele).find('.freebirdFormviewerViewItemsEmbeddedobjectImageWrapper').find('img').attr('src'))
        if (className == "freebirdFormviewerComponentsQuestionRadioRoot") {
            ($(ele).find('label')).each((idx, elem) => {
                if ($(elem).hasClass('isChecked')) {
                    console.log($(elem).text() + "를 선택함");
                } else {
                    console.log($(elem).text() + "를 선택하지 않음");
                }
            })
        } else if (className == "freebirdFormviewerComponentsQuestionTextRoot") {
            if ($(ele).find('input').length != 0)
                console.log('input : ' + $(ele).find('input').attr('data-initial-value'));
            else if ($(ele).find('textarea').length != 0)
                console.log('textarea : ' + $(ele).find('textarea').attr('data-initial-value'));
        } else if (className == "freebirdFormviewerComponentsQuestionCheckboxRoot") {
            ($(ele).find('label')).each((idx, elem) => {
                if ($(elem).hasClass('isChecked')) {
                    console.log($(elem).text() + "를 선택함");
                } else {
                    console.log($(elem).text() + "를 선택하지 않음");
                }
            })
        } else if (className == "freebirdFormviewerComponentsQuestionSelectRoot") {
            $(ele).find('.quantumWizMenuPaperselectOption').each((idx, elem) => {
                if ($(elem).text() == "선택");
                else if ($(elem).attr('aria-selected') == "true") {
                    console.log('선택됨 : ' + $(elem).text())
                } else {
                    console.log('선택되지않음 : ' + $(elem).text())
                }
            })
        } else if (className == "freebirdFormviewerComponentsQuestionScaleRoot") {
            $(ele).find('.appsMaterialWizToggleRadiogroupEl').each((idx, elem) => {
                if ($(elem).attr('aria-checked') == "false") {
                    console.log('선택되지않음 : ' + $(elem).attr('data-value'));
                } else {
                    console.log('선택됨 : ' + $(elem).attr('data-value'));
                }
            })
        } else if (className == "freebirdFormviewerComponentsQuestionGridRoot") {
            $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .appsMaterialWizToggleRadiogroupGroupContainer .appsMaterialWizToggleRadiogroupGroupContent').each((idx, elem) => {
                $(elem).find('.freebirdFormviewerComponentsQuestionGridCell').each((idx, elemt) => {
                    if (idx == 0) {
                        console.log($(elemt).text())
                    } else {
                        console.log($(elemt).find('.appsMaterialWizToggleRadiogroupEl').attr('data-value') + " : " + $(elemt).find('.appsMaterialWizToggleRadiogroupEl').attr('aria-checked'));
                    }
                })
            })
            $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .freebirdFormviewerComponentsQuestionGridCheckboxGroup').each((idx, elem) => {
                $(elem).find('.freebirdFormviewerComponentsQuestionGridCell').each((idx, elemt) => {
                    if (idx == 0) {
                        console.log($(elemt).text())
                    } else {
                        console.log($(elemt).find('.quantumWizTogglePapercheckboxEl').attr('data-answer-value') + " : " + $(elemt).find('.quantumWizTogglePapercheckboxEl').attr('aria-checked'));
                    }
                })
            })
        } else if (className == undefined) {
            console.log($(ele).find('input').attr('data-initial-value'));
        } else if (className == "freebirdFormviewerComponentsQuestionTimeRoot") {
            $(ele).find('input').each((idx, elem) => {
                console.log($(elem).attr('data-initial-value'));
            })
            $(ele).find('.quantumWizMenuPaperselectOption').each((idx, elem) => {
                if ($(elem).attr('aria-selected') == "true") {
                    console.log($(elem).attr('data-value'))
                }
            })
        } else {
            console.log(className);
        }
    })
})