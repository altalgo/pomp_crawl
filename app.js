const express = require('express');
const app = express();
const body = require('body-parser');
const fs = require('fs');
const https = require('https');
const cors = require('cors');
const cheerio = require("cheerio");
const axios = require('axios');

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
let ret = {
    session: "",
    data: [

    ]
}
app.use('/get', (req, res) => {
    const $ = cheerio.load(req.body.data)
    let $head = $('.freebirdFormviewerViewNoPadding');
    $head = $head.find('.freebirdFormviewerViewHeaderHeader')
    let title = $head.find('.freebirdFormviewerViewHeaderTitleRow').find('.freebirdFormviewerViewHeaderTitle').text()
    // console.log(title)
    let desc = $head.find('.freebirdFormviewerViewHeaderDescription').text();
    ret.data[0] = { title, desc };

    const $body = $('.freebirdFormviewerViewNumberedItemContainer');
    // console.log($($body[0]).html());
    $body.each((idx, ele) => {
        console.log(ret);
        let className = $(ele).children().children().children().eq(1).attr('class');
        // console.log(className);
        ret.data[idx + 1] = {
            title: $(ele).find('.freebirdFormviewerComponentsQuestionBaseTitle').text(),
            desc: $(ele).find('.freebirdFormviewerComponentsQuestionBaseDescription').text(),
            imgUrl: $(ele).find('.freebirdFormviewerViewItemsEmbeddedobjectImageWrapper').find('img').attr('src')
        }

        if (className == "freebirdFormviewerComponentsQuestionRadioRoot") {
            // 객관식 Radio
            let isChecked;
            let lst = [];
            ($(ele).find('label')).each((idx, elem) => {
                if ($(elem).hasClass('isChecked')) {
                    isChecked = $(elem).text();
                    lst.push($(elem).text())
                } else {
                    lst.push($(elem).text())
                    // console.log($(elem).text() + "를 선택하지 않음");
                }
            })
            ret.data[idx + 1] += {
                type: 2,
                list: lst,
                ans: isChecked
            };
        } else if (className == "freebirdFormviewerComponentsQuestionTextRoot") {
            ret.data[idx + 1] += {
                type: 0,
                list: "",
                ans: ""
            };
            // 단답형
            if ($(ele).find('input').length != 0) {
                ret.data[idx + 1].type = 0;
                ret.data[idx + 1].ans = $(ele).find('input').attr('data-initial-value');
            } else if ($(ele).find('textarea').length != 0) {
                // 장문형
                ret.data[idx + 1].type = 1;
                ret.data[idx + 1].ans = $(ele).find('textarea').attr('data-initial-value');
            }
        } else if (className == "freebirdFormviewerComponentsQuestionCheckboxRoot") {
            // 체크박스
            let isChecked = [];
            let lst = [];
            ($(ele).find('label')).each((idx, elem) => {
                if ($(elem).hasClass('isChecked')) {
                    isChecked.push((elem).text())
                    lst.push($(elem).text());
                } else {
                    lst.push($(elem).text());
                }
            })
            ret.data[idx + 1] += {
                type: 3,
                list: lst,
                ans: isChecked
            };
        } else if (className == "freebirdFormviewerComponentsQuestionSelectRoot") {
            // 드롭다운
            let isChecked;
            let lst = [];
            $(ele).find('.quantumWizMenuPaperselectOption').each((idx, elem) => {
                if ($(elem).text() == "선택");
                else if ($(elem).attr('aria-selected') == "true") {
                    isChecked = $(elem).text();
                    lst.push($(elem).text())
                } else {
                    lst.push($(elem).text())
                }
            })
            ret.data[idx + 1] += {
                type: 4,
                list: lst,
                ans: isChecked
            };
        } else if (className == "freebirdFormviewerComponentsQuestionScaleRoot") {
            // 직선단계
            let isChecked;
            let lst = [];
            $(ele).find('.appsMaterialWizToggleRadiogroupEl').each((idx, elem) => {
                if ($(elem).attr('aria-checked') == "false") {
                    lst.push($(elem).attr('data-value'))
                } else {
                    lst.push($(elem).attr('data-value'))
                    isChecked = $(elem).attr('data-value');
                }
            })
            ret.data[idx + 1] += {
                type: 5,
                list: lst,
                ans: isChecked
            };
        } else if (className == "freebirdFormviewerComponentsQuestionGridRoot") {
            // 객관식 그리드 6
            let hang = []
            let ryul = []
            let isChecked = [];
            let chk = 0;
            $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .appsMaterialWizToggleRadiogroupGroupContainer .appsMaterialWizToggleRadiogroupGroupContent').each((idx, elem) => {
                $(elem).find('.freebirdFormviewerComponentsQuestionGridCell').each((idx, elemt) => {
                    if (idx == 0) {
                        hang.push($(elemt).text())
                    } else {
                        ryul.push($(elemt).find('.appsMaterialWizToggleRadiogroupEl').attr('data-value'))
                        if ($(elemt).find('.appsMaterialWizToggleRadiogroupEl').attr('aria-checked') == "true") {
                            isChecked.push({
                                hang: hang[hang.length - 1],
                                ryul: ryul[ryul.length - 1]
                            })
                        }
                    }
                })
            })

            // 체크박스 그리드 7
            $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .freebirdFormviewerComponentsQuestionGridCheckboxGroup').each((idx, elem) => {
                chk = 1;
                $(elem).find('.freebirdFormviewerComponentsQuestionGridCell').each((idx, elemt) => {
                    if (idx == 0) {
                        hang.push($(elemt).text())
                    } else {
                        ryul.push($(elemt).find('.quantumWizTogglePapercheckboxEl').attr('data-answer-value'))
                        if ($(elemt).find('.quantumWizTogglePapercheckboxEl').attr('aria-checked') == "true") {
                            isChecked.push({
                                hang: hang[hang.length - 1],
                                ryul: ryul[ryul.length - 1]
                            })
                        }
                    }
                })
            })

            if (chk == 1) {
                ret.data[idx + 1] = {
                    type: 7
                }
            } else {
                ret.data[idx + 1] = {
                    type: 6
                }
            }

            ret.data[idx + 1] += {
                list: {
                    hang: hang,
                    ryul: ryul
                },
                ans: isChecked
            };
        } else if (className == undefined) {
            // 날짜
            console.log($(ele).find('input').attr('data-initial-value'))
            ret.data[idx + 1] += {
                type: 8,
                list: "",
                ans: $(ele).find('input').attr('data-initial-value')
            };
        } else if (className == "freebirdFormviewerComponentsQuestionTimeRoot") {
            // 시간
            let ret = "";
            $(ele).find('input').each((idx, elem) => {
                if (idx == 0) {
                    ret = $(elem).attr('data-initial-value');
                } else {
                    ret += " : " + $(elem).attr('data-initial-value');
                }
            })
            $(ele).find('.quantumWizMenuPaperselectOption').each((idx, elem) => {
                if ($(elem).attr('aria-selected') == "true") {
                    ret += $(elem).attr('data-value');
                }
            })
            console.log(ret.data)
            ret.data[idx + 1] += {
                type: 9,
                list: "",
                ans: ret
            };
        } else {
            console.log(className);
        }
    })
    console.log(ret)
})