const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class Vana {
    headers(initData) {
        return {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            "X-Telegram-Web-App-Init-Data": initData
        };
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[*] Need to wait ${i} Seconds to continue ...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async getPlayerData(initData) {
        const url = 'https://www.vanadatahero.com/api/player';
        const headers = this.headers(initData);
        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error) {
            this.log(`${'Error when calling API'.red}`);
            console.error(error);
        }
    }

    getRandomPoints(min = 1, max = 1000) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async postTaskCompletion(initData, taskId, points) {
        const url = `https://www.vanadatahero.com/api/tasks/${taskId}`;
        const headers = this.headers(initData);
        const payload = {
            status: "completed",
            points: points // Pastikan ini adalah angka
        };

        try {
            console.log(`Working On:`, payload); // Log payload untuk debug
            const response = await axios.post(url, payload, { headers });
            console.log(`Response from server:`, response.data); // Log response untuk debug
            if (response.data && response.data.message === 'Points limit exceeded') {
                this.log(`${'Has exceeded today point limit!'.red}`);
                return false; 
            }
            if (response.data && response.data.message === 'Incorrect points value') {
                this.log(`${'Incorrect points value'.red}`);
                return false;
            }
            return true;
        } catch (error) {
            if (error.response) {
                console.error('API response error:', error.response.data); // Log error response
            } else {
                console.error('Request error:', error.message); // Log request error
            }
            this.log(`${'Error when completing the task'.red}`);
            return false;
        }
    }

    async getTasks(initData) {
        const url = 'https://www.vanadatahero.com/api/tasks';
        const headers = this.headers(initData);
        try {
            const response = await axios.get(url, { headers });
            return response.data.tasks;
        } catch (error) {
            this.log(`${'Error when taking the mission list'.red}`);
            console.error(error);
        }
    }

    async completePendingTasks(initData) {
        const tasks = await this.getTasks(initData);
        const excludeIds = [2, 17, 5, 9]; // Pastikan ID ini dikecualikan jika diperlukan
    
        for (const task of tasks) {
            if (task.completed.length === 0 && !excludeIds.includes(task.id)) { 
                let randomPoints = this.getRandomPoints(); // Ambil nilai poin acak
                let success = await this.postTaskCompletion(initData, task.id, randomPoints);

                if (!success) {
                    this.log(`${'Error with random points. Retrying with lower points.'.yellow}`);
                    randomPoints = this.getRandomPoints(1, 500); // Coba nilai yang lebih kecil
                    success = await this.postTaskCompletion(initData, task.id, randomPoints);
                }

                if (success) {
                    this.log(`${`Do the mission`.green} ${task.name.yellow} ${`Success | reward: `.green} ${randomPoints}`);
                } else {
                    this.log(`${'Failed to complete the task even after retry'.red}`);
                }
            }
        }
    }

    async processAccount(initData, accountIndex) {
        try {
            const playerData = await this.getPlayerData(initData);

            if (playerData) {
                console.log(`========== ${'VANA POINT INJECT'.yellow} | ${'t.me/ugdairdrop'.yellow} ==========`);
                this.log(`${'Account:'.green} ${playerData.tgFirstName.white}`);
                this.log(`${'Points:'.green} ${playerData.points.toString().white}`);
                this.log(`${'Multiplier:'.green} ${playerData.multiplier.toString().white}`);
            } else {
                this.log(`${'Error: No user data found'.red}`);
            }

            while (true) {
                const randomPoints = this.getRandomPoints(); // Ambil nilai poin acak
                const taskCompleted = await this.postTaskCompletion(initData, 1, randomPoints);

                if (!taskCompleted) {
                    this.log(`${'Stopping process due to task completion failure'.red}`);
                    break;
                }

                const updatedPlayerData = await this.getPlayerData(initData);

                if (updatedPlayerData) {
                    this.log(`${'Tap successfully. Current balance:'.green} ${updatedPlayerData.points.toString().white}`);
                } else {
                    this.log(`${'Error: No user data found after tap'.red}`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000)); 
            }

            await this.completePendingTasks(initData);

        } catch (error) {
            this.log(`${'Error when processing accounts'.red}`);
            console.error(error);
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const initDataList = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        for (let i = 0; i < initDataList.length; i++) {
            const initData = initDataList[i];
            await this.processAccount(initData, i + 1);
            await this.waitWithCountdown(3);
        }
        await this.waitWithCountdown(86400);
    }
}

if (require.main === module) {
    const vana = new Vana();
    vana.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}