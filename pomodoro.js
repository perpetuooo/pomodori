function timer(interval) {
    let time = 0

    const id = setInterval(() => {
        console.log(time)
        time++

        if (time > interval) {
            clearInterval(id)
        }
    }, 1000)
}
