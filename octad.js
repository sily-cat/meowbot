// written by @ysinx on discord
export function solveOctad(digit_arr) {

    let block_swap = [ 0, 1, 2, 3,  8,10,11, 9, 12,15,13,14, 16,17,18,19, 20,22,23,21,  4, 7, 5, 6];
    let main_cycle = [ 1, 2, 3, 4,  0, 5, 6, 7,  8,16,12,20, 22,14,18,10, 13,21, 9,17, 19,11,23,15];
    let mini_cycle = [ 0, 3, 1, 2,  4, 7, 5, 6,  8,11, 9,10, 12,15,13,14, 16,19,17,18, 20,23,21,22];
    let block_flip = [ 0, 1, 2, 3,  4, 5, 6, 7, 23,22,21,20, 19,18,17,16, 15,14,13,12, 11,10, 9, 8];

    let basic_permutations = {"block_swap" : block_swap, "main_cycle" : main_cycle, "mini_cycle" : mini_cycle, "block_flip" : block_flip};

    let input_pos_arr = [];

    function permute(p_name, rev) {

        let temp_arr = new Array(24);
        temp_arr.fill(0);

        if (rev == 0) {
            for (let i = 0; i < 24; i++) {
                temp_arr[i] = digit_arr[basic_permutations[p_name][i]];
            }
        } else {
            for (let i = 0; i < 24; i++) {
                temp_arr[basic_permutations[p_name][i]] = digit_arr[i];
            }
        }

        for (let i = 0; i < 24; i++) {
            digit_arr[i] = temp_arr[i];
        }

    }

    let ones_counter = 23;

    for (let index = 0; index < 24; index++) {

        if (digit_arr[index] == 1) {

            ones_counter += 1;
            digit_arr[index] = ones_counter;
            input_pos_arr.push(index);

        } else {

            digit_arr[index] = index;

        }

    }
for (let target = 24; target < 29; target++) {

        if (digit_arr.indexOf(target) < 4) {

            main_cycle_counter = 0;

            while (digit_arr.indexOf(target) < 4) {

                permute("main_cycle", 0);
                main_cycle_counter += 1;

            }

            permute("block_swap", 0);

            while (main_cycle_counter > 0) {

                permute("main_cycle", 1);
                main_cycle_counter -= 1;

            }

        }

        if (digit_arr.indexOf(target) % 4 != 0) {

            if (digit_arr.indexOf(target) < 8) {
                permute("block_swap", 0);
            }

            mini_cycle_counter = 0;

            while (digit_arr.indexOf(target) % 4 != 3) {

                permute("mini_cycle", 0);
                mini_cycle_counter += 1;

            }

            permute("block_flip", 0);

            while (mini_cycle_counter > 0) {

                permute("mini_cycle", 1);
                mini_cycle_counter -= 1;

            }

        }

        while (digit_arr.indexOf(target) != 4) {

            permute("block_swap", 0);

        }

        permute("main_cycle", 0);

    }

    let return_arr = new Array(24);
    return_arr.fill(0);

    for (let i = 0; i < 24; i++) {

        if (input_pos_arr.includes(i) || digit_arr.slice(5, 8).includes(i)) {

            return_arr[i] = 1;

        }

    }

    return return_arr;

}